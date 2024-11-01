const streamPricesVALR = require('../services/VALR/streamPrices');
const { streamAccountUpdates } = require('../services/VALR/streamTrades');
const eventEmitter = require('../utils/eventEmitter');

let config = {};

async function subscribeToAll(passedConfig) {
    config = passedConfig;
    streamPricesVALR(config, handlePriceUpdateVALR, handleSnapshotUpdateVALR, handleAccountUpdate);
    streamAccountUpdates(handleAccountUpdate);
}

function handlePriceUpdateVALR(priceDataVALR) {
    eventEmitter.emit('priceUpdateVALR', priceDataVALR);
}
function handleSnapshotUpdateVALR(bidArray, askArray, timeStamp) {
    eventEmitter.emit('snapshotUpdateVALR', bidArray, askArray, timeStamp);
}

function handleAccountUpdate(accountData) {


    if (accountData.type === 'BALANCE_UPDATE') {
        // console.log(`[${new Date().toISOString()}]🍌🍌 BALANCE_UPDATE`,accountData.data.currency.symbol,accountData.data.updatedAt,accountData.data.total)
        if(!config.primary_market.includes('PERP')){
            if(accountData.data.currency.symbol === config.base_ccy){
                eventEmitter.emit('balanceUpdate', accountData.data.total);
            }
        }
    }
    if (accountData.type === 'OPEN_POSITION_UPDATE') {
        if(config.secondary_market===accountData.data.pair){
            if(accountData.data.side === 'sell'){
                eventEmitter.emit('positionUpdate', -accountData.data.quantity);
            } else {
                eventEmitter.emit('positionUpdate', accountData.data.quantity);
            }
        }   
    }

    if (accountData.type === 'NEW_ACCOUNT_TRADE' && (accountData.currencyPairSymbol === config.primary_market || accountData.currencyPairSymbol === config.secondary_market)) {
        // console.log(`[${new Date().toISOString()}]🍐🍐 NEW_ACCOUNT_TRADE`,accountData.data.tradedAt)
        eventEmitter.emit('tradeUpdate', accountData);
    }
    if (accountData.type === 'OPEN_ORDERS_UPDATE') {
        const openOrders = accountData.data.filter(order => order.currencyPair === config.primary_market);
        // console.log(`[${new Date().toISOString()}]🍍🍍 OPEN_ORDERS_UPDATE`,openOrders[0]?.updatedAt, openOrders[0]?.status)
        if (openOrders.length > 0) {
            eventEmitter.emit('orderUpdate', openOrders);
        }
    }
    if (accountData.type === 'ORDER_PROCESSED') {
        if(accountData.data.success === false) {
            console.log(`[${new Date().toISOString()}] VALR Order failed`, accountData.data.failureReason);
            process.exit(1)
        }
    }
    if (accountData.type === "ORDER_STATUS_UPDATE") {
        eventEmitter.emit('OrderProcessed', accountData);
    }
    if (accountData.type === "RATE_LIMIT_EXCEEDED") {
        console.log(`[${new Date().toISOString()}] Rate limited`, accountData);
    }
    // if (accountData.type === "PLACE_MARKET_WS_RESPONSE") {
    //     eventEmitter.emit('OrderProcessed', accountData);
    // }
    // if (accountData.type === "PLACE_LIMIT_WS_RESPONSE") {
    //     eventEmitter.emit('OrderProcessed', accountData);
    // }
    //this is a slightly faster response than ORDER_STATUS_UPDATE but only tells you the result of your action
    // if (accountData.type === "CANCEL_ORDER_WS_RESPONSE") {
    //     eventEmitter.emit('OrderProcessed', accountData);
    // }
    if(accountData === 1006 || accountData === 1012){
        accountData = {}; 
        accountData.type = 'DISCONNECT';
        accountData.code = accountData;
        eventEmitter.emit('OrderProcessed', accountData);
    }
    if (accountData.type === 'CANCEL_ON_DISCONNECT_UPDATE') {
        eventEmitter.emit('OrderProcessed', accountData);
    }
}

module.exports = {
    subscribeToAll,
};
