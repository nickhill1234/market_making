const eventEmitter = require('../utils/eventEmitter');
const { logExecution, logPremiumFeed } = require('../utils/logger');
const  setRatios  = require('../utils/setRatios');
const  formatPrices  = require('../utils/formatPrices');
const { cancelOrder, placeLimitOrder, placeMarketOrder } = require('../services/VALR/streamTrades');
const CancelAll = require('../services/VALR/cancelAll');

const packageJson = require('../../package.json');

let logPremiumFeedCheck = false
let historicOBSnap = {BIDS: [], ASKS: []};
let hedgeStateUpdated = false;
let currentRatios = { BID: null, ASK: null};
let market = '';
let config = {};
let positionState = {
    primary_market: { size: null, side: null},
    secondary_market: { size: null, side: null}
};
let filledOrderState = {
    SELL: { size: 0 },
    BUY: { size: 0 }
};
let valrExecutedOrderDetails = { total_value: 0, total_size: 0, tradedAt: null, vwap: 0 }; 
let wsOpenOrders = {
    ASK: { price: null, reference_price: null, cancel_price: null, orderId: null },
    BID: { price: null, reference_price: null, cancel_price: null, orderId: null }
};
let valrCurrentPrice = {
     primary_market: { BID: null, ASK: null },
     secondary_market: { BID: null, ASK: null },
};

async function initialize(passedConfig) {
    config = passedConfig;
    market = config.primary_market;
    setState();
    eventEmitter.on('priceUpdateVALR', handlePriceUpdateVALR);
    eventEmitter.on('snapshotUpdateVALR', handleSnapshotUpdateVALR);

    eventEmitter.on('tradeUpdate', handleOrderExecuted);
    eventEmitter.on('orderUpdate', handleOrderUpdates);
    eventEmitter.on('balanceUpdate', handleBalanceUpdates);
    eventEmitter.on('positionUpdate', handlePositionUpdates);
    eventEmitter.on('OrderProcessed', handleVALROrderProcessed);

    startMonitoringPriceUpdates();
}

async function setState() {
    await delay(3000); // see if we move this here if we can pick up the execution logging more accurately

    CancelAll(config);

    const { bidMultiplier, askMultiplier } = setRatios(config, positionState.secondary_market.size);
    currentRatios.BID = bidMultiplier;
    currentRatios.ASK = askMultiplier;
    hedge_state = Math.abs(positionState.secondary_market.size + positionState.primary_market.size)
    if(hedge_state > config.min_hedge_size * 5){
        console.log('Bot is unhedged',hedge_state,'Primary', positionState.primary_market.size, 'Secondary', positionState.secondary_market.size)
        process.exit(1)
    }
    if(positionState.secondary_market.size > config.max_position || positionState.primary_market.size > config.max_position){
        console.log('Max positions exceeded. Primary',positionState.primary_market.size,'Secondary',positionState.secondary_market.size)
        process.exit(1)
    }
    console.log(`
        _____________________________________________
        Bot Version: ${packageJson.version}
        Markets:  ${config.primary_market} & ${config.secondary_market}
        Position Size Primary: ${positionState.primary_market.size}
        Position Size Hedged: ${positionState.secondary_market.size}
        Base rate: ${config.base}
        Spread rate: ${config.spread_margin}
        Current Target Ask: ${currentRatios.ASK}
        Current Target Bid: ${currentRatios.BID}
        _____________________________________________`); 

    hedgeStateUpdated = true;
}

let orderPending = false
function checkOrderPlacement(valrCurrentPrice){
    const { target_limit_bid, target_limit_ask } = { target_limit_bid: currentRatios.BID * valrCurrentPrice.secondary_market.BID, target_limit_ask: currentRatios.ASK * valrCurrentPrice.secondary_market.ASK};
    const { formatted_limit_bid, formatted_limit_ask } = formatPrices(target_limit_bid, target_limit_ask, config)
    if (!orderPending && (valrCurrentPrice.primary_market.BID / valrCurrentPrice.secondary_market.BID < currentRatios.BID) && wsOpenOrders.BID.price === null && hedgeStateUpdated) {
        orderPending = true
        console.log(`[${new Date().toISOString()}] 🔄🔄 Placing BUY Order : Current premium ${valrCurrentPrice.primary_market.BID / valrCurrentPrice.secondary_market.BID} vs Target premium: ${currentRatios.BID}`);
        referencePrice = valrCurrentPrice.secondary_market.BID.toString().replace('.', 'B')+ 'A' + (Math.floor(Math.random() * 900) + 100)
        placeLimitOrder('BUY', formatted_limit_bid, config, referencePrice, filledOrderState.BUY.size);

    } else if (!orderPending && (valrCurrentPrice.primary_market.ASK / valrCurrentPrice.secondary_market.ASK > currentRatios.ASK) && wsOpenOrders.ASK.price === null && hedgeStateUpdated) {
        orderPending = true
        console.log(`[${new Date().toISOString()}] 🔄🔄 Placing SELL Order : Current premium ${valrCurrentPrice.primary_market.ASK / valrCurrentPrice.secondary_market.ASK} vs Targeting premium: ${currentRatios.ASK}`);
        referencePrice = valrCurrentPrice.secondary_market.ASK.toString().replace('.', 'B')+ 'A' + (Math.floor(Math.random() * 900) + 100)
        placeLimitOrder('SELL', formatted_limit_ask, config, referencePrice, filledOrderState.SELL.size);
    }    
}

function checkDrift(){
    if( !cancelPending && wsOpenOrders.BID.price != null && wsOpenOrders.BID.price < (valrCurrentPrice.primary_market.BID * (1 - config.cancellation_drift)) || 
        !cancelPending && wsOpenOrders.ASK.price != null && wsOpenOrders.ASK.price > (valrCurrentPrice.primary_market.ASK * (1 + config.cancellation_drift)) ) {
        console.log(`[${new Date().toISOString()}]🌊 🌊 DRIFT Triggered`, wsOpenOrders.BID.price != null ? `Open BID ${wsOpenOrders.BID.price} < ${(valrCurrentPrice.primary_market.ASK * (1 - config.cancellation_drift))} VALR ASK-S` : `Open ASK ${wsOpenOrders.ASK.price} > ${(valrCurrentPrice.primary_market.BID * (1 + config.cancellation_drift))} VALR BID+S`)
        cancelRequest()
    }
}

let cancelPending = false
async function cancelRequest(){
    if (!cancelPending) {
        cancelPending = true
        if (wsOpenOrders.BID.price) {
            cancelOrder(wsOpenOrders.BID.orderId, config.primary_market);
        }
        if (wsOpenOrders.ASK.price) {
            cancelOrder(wsOpenOrders.ASK.orderId, config.primary_market);
        }        
    }
}

async function handlePriceUpdateVALR(priceDataVALR) {

    if(priceDataVALR.currencyPair === config.primary_market) {
        valrCurrentPrice.primary_market.BID = parseFloat(priceDataVALR.bid);
        valrCurrentPrice.primary_market.ASK = parseFloat(priceDataVALR.ask);
    } else if( priceDataVALR.currencyPair === config.secondary_market) {
        valrCurrentPrice.secondary_market.BID = parseFloat(priceDataVALR.bid);
        valrCurrentPrice.secondary_market.ASK = parseFloat(priceDataVALR.ask);
    }
    
    if (!cancelPending && wsOpenOrders.BID.price != null && valrCurrentPrice.primary_market.BID / valrCurrentPrice.secondary_market.BID > currentRatios.BID || 
        !cancelPending && wsOpenOrders.ASK.price != null && valrCurrentPrice.primary_market.ASK / valrCurrentPrice.secondary_market.ASK < currentRatios.ASK ) {
        console.log(`[${new Date().toISOString()}] 🔵🔵 VALR Cancel`, wsOpenOrders.BID.reference_price != null ? `Market BID Ratio: ${valrCurrentPrice.primary_market.BID / valrCurrentPrice.secondary_market.BID} > ${currentRatios.BID} Target Bid Ratio` : `Market ASK Ratio: ${valrCurrentPrice.primary_market.ASK / valrCurrentPrice.secondary_market.ASK} < ${currentRatios.ASK} Target Ask Ratio`);
        cancelRequest()
    }
    checkOrderPlacement(valrCurrentPrice)
    checkDrift();  
    lastPriceUpdateTimestamp = Date.now();

}

async function handleSnapshotUpdateVALR(bidArray, askArray, timeStamp) {
    const timeNow = Date.now();
    const timeFeed = new Date(timeStamp);
    const latency = timeNow - timeFeed.getTime();

    const newBidEntries = bidArray.map(bid => ({
        price: bid[0],   // Price
        size: bid[1]     // Size
    }));

    // Create entries for asks with a common timestamp and latency
    const newAskEntries = askArray.map(ask => ({
        price: ask[0],   // Price
        size: ask[1]     // Size
    }));

    // Check if the snapshot length exceeds the limit for bids and remove the oldest entries if necessary
    if (historicOBSnap.BIDS.length >= 15) {
        historicOBSnap.BIDS.shift(); // Remove the oldest entry
    }
    // Add the new entries along with the timestamp and latency
    historicOBSnap.BIDS.push({
        timestamp: timeFeed.toISOString(),
        latency: latency,
        entries: newBidEntries
    });

    // Check if the snapshot length exceeds the limit for asks and remove the oldest entries if necessary
    if (historicOBSnap.ASKS.length >= 15) {
        historicOBSnap.ASKS.shift(); // Remove the oldest entry
    }
    // Add the new entries along with the timestamp and latency
    historicOBSnap.ASKS.push({
        timestamp: timeFeed.toISOString(),
        latency: latency,
        entries: newAskEntries
    });
    if (logPremiumFeedCheck) {
        const logBidEntries = historicOBSnap.BIDS.map(entry => 
            `BIDS, ${entry.timestamp}, ${entry.latency},${JSON.stringify(entry.entries)}`).join(';');
        const logAskEntries = historicOBSnap.ASKS.map(entry => 
            `ASKS, ${entry.timestamp}, ${entry.latency}, ${JSON.stringify(entry.entries)}`).join(';');
        logPremiumFeed(market,logBidEntries);
        logPremiumFeed(market,logAskEntries);
        logPremiumFeedCheck = false
    }
}

async function handleOrderUpdates(openOrders) {

    openOrders.forEach(order => {
        if (order.side) {
            wsOpenOrders[order.side === "buy" ? "BID" : "ASK"].price = order.price;
            wsOpenOrders[order.side === "buy" ? "BID" : "ASK"].orderId = order.orderId;
            const parts = order.customerOrderId.split('A');
            wsOpenOrders[order.side === "buy" ? "BID" : "ASK"].reference_price = parts[0].toString().replace('B', '.')
            if(orderPending){
                console.log(`[${new Date().toISOString()}] ✅✅ Open ${order.side} order at ${order.price} w/t ref ${order.customerOrderId.toString().replace('B', '.')}. Premium check:`, order.side === 'sell'? `${order.price/wsOpenOrders.ASK.reference_price} > ${currentRatios.ASK}`:`${order.price/wsOpenOrders.BID.reference_price}<${currentRatios.BID}`);
            }
            orderPending = false
        } 
    });
    if (openOrders.length === 0){
        //no open orders means we need to reset the state
        wsOpenOrders = {
            ASK: { price: null, reference_price: null, orderId: null },
            BID: { price: null, reference_price: null, orderId: null }
        };
        cancelPending = false
        orderPending = false
    }

}

async function handleVALROrderProcessed(accountData) {
     if(accountData.type === "PLACE_MARKET_WS_RESPONSE"){
        if(!accountData.data){
            console.log(`[${new Date().toISOString()}] Error placing market order on VALR`)
            process.exit(1)
        }
     }
     if(accountData.type === "PLACE_MARKET_WS_RESPONSE" && accountData.error){
        console.log(`[${new Date().toISOString()}] Error placing limit order on VALR`,accountData.error.message)
        process.exit(1)
     } 
    //  if(accountData.type === "CANCEL_ORDER_WS_RESPONSE" && accountData.data.orderId){
    //     console.log(`[${new Date().toISOString()}] ⏪⏪ Cancel Processed for`, accountData.data.orderId);
    //     wsOpenOrders = {
    //         ASK: { price: null, reference_price: null, orderId: null },
    //         BID: { price: null, reference_price: null, orderId: null }
    //     };
    //     cancelPending = false
    //  }
     if(accountData.type === "PLACE_LIMIT_WS_RESPONSE"){
        if(accountData.error){
            console.log(`[${new Date().toISOString()}] VALR Placing limited order failed`,accountData.error.message,`validationErrors`,accountData.error.validationErrors);
            process.exit(1)
        }
     }
     if(accountData.type === "DISCONNECT"){
        console.log(`[${new Date().toISOString()}] VALR WS Disconnected || Connection closed, cancelling orders. Message`,accountData);
        CancelAll(config);
    }
    if(accountData.type === "CANCEL_ON_DISCONNECT_UPDATE"){
        console.log(`[${new Date().toISOString()}] VALR WS Reconnected. Setting ${cancelPending} and ${orderPending} to ${false} `);
        wsOpenOrders = {
            ASK: { price: null, reference_price: null, orderId: null },
            BID: { price: null, reference_price: null, orderId: null }
        };
        cancelPending = false
        orderPending = false
    }

    if(accountData.type === "ORDER_STATUS_UPDATE" && accountData.data.orderId){
        if(accountData.data.orderStatusType === "Cancelled"){
            console.log(`[${new Date().toISOString()}] ⏪⏪ ORDER_STATUS_UPDATE Cancel Processed for`, accountData.data.orderId);
            wsOpenOrders = {
                ASK: { price: null, reference_price: null, orderId: null },
                BID: { price: null, reference_price: null, orderId: null }
            };
            cancelPending = false
        }
    }    
}

async function handleOrderExecuted(tradeData) {
    if(tradeData.currencyPairSymbol === config.primary_market){
        handleLimitOrderExecuted(tradeData)
    }
    if(tradeData.currencyPairSymbol === config.secondary_market ){ 

        valrExecutedOrderDetails.total_size += parseFloat(tradeData.data.quantity)
        valrExecutedOrderDetails.total_value +=  parseFloat(tradeData.data.quantity) * parseFloat(tradeData.data.price)
        valrExecutedOrderDetails.tradedAt =  tradeData.data.tradedAt
        valrExecutedOrderDetails.vwap = (valrExecutedOrderDetails.total_value/valrExecutedOrderDetails.total_size)
    }
}

async function handleBalanceUpdates(stateUpdate){
    positionState.primary_market.size = parseFloat(stateUpdate)
}

async function handlePositionUpdates(stateUpdate){
    positionState.secondary_market.size = parseFloat(stateUpdate)
}


async function handleLimitOrderExecuted(tradeData) {
    cancelPending = true // prevent us loosing the data from cancelled orders (you can shift the )
    const quantity = parseFloat(tradeData.data.quantity);
    sideExecuted = tradeData.data.side.toUpperCase();    
    const opposingSide = sideExecuted === 'SELL' ? 'BUY' : 'SELL';
    
    filledOrderState[sideExecuted].size += quantity
    console.log(`[${new Date().toISOString()}] ${sideExecuted} 🎉🎉 TRADE EXECUTED. Size ${quantity}. Filled state ${filledOrderState[sideExecuted].size}. ID ${tradeData.data.orderId}`);

    if (filledOrderState[sideExecuted].size >= config.min_hedge_size) {
        hedgeStateUpdated = false; // prevent more orders from being placed until we get a updated balance (otherwise our state is wrong)
        const sizeHedge = parseFloat(filledOrderState[sideExecuted].size.toFixed(config.min_hedge_size.toString().split('.')[1]?.length || 0));
        filledOrderState[sideExecuted].size -= sizeHedge //change FOS here so that it does not hedge the same order twice

        placeMarketOrder(opposingSide ,config.secondary_market, sizeHedge, tradeData.data.orderId);

        await delay(50)
        logPremiumFeedCheck = true
  
        const ref_price = wsOpenOrders[sideExecuted === "BUY" ? "BID" : "ASK"].reference_price;
        const orderLatency = new Date(tradeData.data.tradedAt) - new Date(valrExecutedOrderDetails.tradedAt);   
        actual_premium = (tradeData.data.price/valrExecutedOrderDetails.vwap) - 1;
        target_premium = sideExecuted === "BUY" ? currentRatios.BID - 1 : currentRatios.ASK - 1;
        slippage = sideExecuted === "BUY" ? -(actual_premium - target_premium) : actual_premium - target_premium
        cancel_drift = [sideExecuted === "BUY" ? 1 : -1 ] * (valrExecutedOrderDetails.vwap / ref_price - 1);
        logExecution(market,`${packageJson.version},${sideExecuted}, ${actual_premium},${target_premium},${slippage}, ${positionState.secondary_market.size},${tradeData.data.price}, ${valrExecutedOrderDetails.vwap}, ${orderLatency},${cancel_drift},${ref_price} ,${tradeData.data.tradedAt},${valrExecutedOrderDetails.tradedAt}, ${config.min_order},${config.base},${config.spread_margin}, ${config.range} `);

        filledOrderState[sideExecuted].size = 0;
        valrExecutedOrderDetails = { total_value: 0, total_size: 0, tradedAt: null, vwap: 0 }; 
        wsOpenOrders = {
            ASK: { price: null, reference_price: null, cancel_price: null, orderId: null },
            BID: { price: null, reference_price: null, cancel_price: null, orderId: null }
        };
        cancelPending = false  
        setState()
        return 

    }
    cancelPending = false
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let lastTimeCheck = Date.now();
let lastPriceUpdateTimestamp = Date.now();
let monitoringInterval = null;

function startMonitoringPriceUpdates() {
    monitoringInterval = setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastTimeCheck > 300000 ) {
            console.log(`[${new Date().toISOString()}] 👮👮 SELL CHECK. Current Premium ${valrCurrentPrice.primary_market.ASK/valrCurrentPrice.secondary_market.ASK} > ${currentRatios.ASK}. Order Active ${wsOpenOrders.ASK.price != null}. Order pending flag ${orderPending}. Cancel pending flag ${cancelPending}`);
            console.log(`[${new Date().toISOString()}] 👮👮 BUY CHECK. Current Premium ${valrCurrentPrice.primary_market.BID/valrCurrentPrice.secondary_market.BID} < ${currentRatios.BID} Order Active ${wsOpenOrders.BID.price != null}Order pending flag ${orderPending}. Cancel pending flag ${cancelPending}`);
            lastTimeCheck = Date.now();
        } 
    }, 500); 
}

module.exports = {
    initialize,
};
