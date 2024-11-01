const streamPricesB2C2 = require('./streamPricesB2C2');
const streamPricesVALR = require('./streamPricesVALR');
const streamPricesBybit = require('../services/Bybit/streamPrices');
const streamPricesKraken = require('../services/Kraken/streamPrices');
const streamPricesBinance = require('./streamPricesBinance');
const streamPricesKrakenFutures = require('./streamPricesKrakenFutures');

const fs = require('fs');
const filePath = './priceData.txt';

const config = {
    primary_market: 'BTCUSDT',
    secondary_market: 'BTCUSD.SPOT',
    cancel_market: 'BTCUSDTPERP',
    cancel_market_2: 'BTC/USD',
    cancel_market_3: 'BTCUSDT',
    base_ccy: 'BTC',
    max_position: 0.001, // COIN
    min_order: 0.0001, // COIN
    min_hedge_size: 0.0001, //COIN
    range: 0.005, // perc
    spread_margin: 0.0001, //perc
    base: 0.02, // perc
    placement_drift: 0.0007, // how close do you want to price to get to the market before you consider cancellations (max slippage)
    tick_size: 0.0001, ///this is the tick size in % terms
    minimum_price_tick_size: 1, ///for setting limit orders
    socket_levels: [0.01],
    allowMarginVALR: false 
};

let latestPriceBybit = null;
let latestPriceKraken = null;
let latestPriceVALR = null;
let latestPriceBinance = null;
let latestPriceKrakenFutures = null;


async function subscribeToAll() {
    streamPricesB2C2(config, handlePriceUpdateB2C2);
    streamPricesVALR(config, handlePriceUpdateVALR);
    streamPricesKraken(config, handlePriceUpdateKraken);
    streamPricesBybit(config, handlePriceUpdateBybit);
    streamPricesBinance(config, handlePriceUpdateBinance);
    streamPricesKrakenFutures(handlePriceUpdateKrakenFutures);

}

function handlePriceUpdateBinance(priceDataBinance) {
    latestPriceBinance = priceDataBinance;
}

function handlePriceUpdateKrakenFutures(priceDataKrakenFutures) {
    latestPriceKrakenFutures = priceDataKrakenFutures;
}

function handlePriceUpdateVALR(priceDataVALR) {
    latestPriceVALR = priceDataVALR;
}

function handlePriceUpdateBybit(priceDataBybit) {
    latestPriceBybit = priceDataBybit;
}

function handlePriceUpdateB2C2(priceDataB2C2) {
    // const combinedData = `${priceDataB2C2?.bid || 'N/A'}, ${priceDataB2C2?.ask || 'N/A'}, ` +
    //                      `${latestPriceBybit?.bid || 'N/A'}, ${latestPriceBybit?.ask || 'N/A'}, ` +
    //                      `${latestPriceKraken?.bid || 'N/A'}, ${latestPriceKraken?.ask || 'N/A'}, ` +
    //                      `${latestPriceVALR?.bid || 'N/A'}, ${latestPriceVALR?.ask || 'N/A'}`;
    const timestamp = new Date().toISOString(); // Formats as "YYYY-MM-DDTHH:MM:SS.sssZ"
    
    const combinedData = `${timestamp},${priceDataB2C2?.bid || 'N/A'},` +
                         `${latestPriceBybit?.bid || 'N/A'}, ` +
                         `${latestPriceKraken?.bid || 'N/A'},` +
                         `${latestPriceVALR?.bid || 'N/A'},` +
                         `${latestPriceKrakenFutures?.bid || 'N/A'},` +
                         `${latestPriceBinance?.bid || 'N/A'}`;


    const dataToWrite = JSON.stringify(combinedData, null, 2);
    fs.appendFile(filePath, `${dataToWrite}\n`, (err) => {
        if (err) {
            console.error('Error writing to file', err);
        } else {
        }
    }); 

}

function handlePriceUpdateKraken(priceDataKraken) {
    latestPriceKraken = priceDataKraken;
}

subscribeToAll();
