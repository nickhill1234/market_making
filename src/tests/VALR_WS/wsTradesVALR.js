require('dotenv').config({ path: '../../../config/.env' });
const WebSocket = require('ws');
const crypto = require('crypto');
const { config } = require('dotenv');
const calculateVWAP = require('../../utils/vwapCalc');

const configTest= {
    min_hedge_size: 0.23,
}
// Function to sign requests
function signRequest(apiSecret, timestamp, verb, path, body = '') {
    const hmac = crypto.createHmac('sha512', apiSecret);
    hmac.update(timestamp.toString());
    hmac.update(verb.toUpperCase());
    hmac.update(path);
    hmac.update(body);
    return hmac.digest('hex');
}

// Function to get authenticated headers
function getAuthHeaders(path) {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = new Date().getTime();
    const signature = signRequest(apiSecret, timestamp, 'GET', path, '');
    
    return {
        'X-VALR-API-KEY': apiKey,
        'X-VALR-SIGNATURE': signature,
        'X-VALR-TIMESTAMP': timestamp.toString()
    };
}

// Store the WebSocket connection globally so it can be reused
let wsConnection;

// Stream prices using a single WebSocket connection
function streamPrices(config) {
    if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED) {
        connectToWebSocket(config);
    } else {
        console.log('WebSocket is already open for price streaming.');
    }
}
// Connect to the WebSocket for both streaming prices and placing/canceling orders
function connectToWebSocket(config) {
    const path = '/ws/trade';
    const url = `wss://api.valr.com${path}`;
    const headers = getAuthHeaders(path);

    wsConnection = new WebSocket(url, { headers });

    wsConnection.on('open', () => {
        console.log(`[${new Date().toISOString()}] WebSocket connected`);

        // Enable cancel on disconnect
        const cancelOnDisconnectMessage = {
            type: 'CANCEL_ON_DISCONNECT',
            payload: {
                cancelOnDisconnect: true
            }
        };
        wsConnection.send(JSON.stringify(cancelOnDisconnectMessage));

        // Subscribe to market data if required
        const subscriptionMessage = {
            type: 'SUBSCRIBE',
            subscriptions: [
                {
                    event: 'AGGREGATED_ORDERBOOK_UPDATE',
                    pairs: ["BTCUSDTPERP","BTCZARPERP"]
                }
            ]
        };
        wsConnection.send(JSON.stringify(subscriptionMessage));
        console.log(`[${new Date().toISOString()}] Subscribed to price updates`);

        // Start ping-pong to keep the connection alive
        startPingPong(wsConnection);
    });

    wsConnection.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('testing',message)
        // Handle price updates
        if (message.type === 'AGGREGATED_ORDERBOOK_UPDATE') {
            let vwapBid = calculateVWAP(message.data.Bids, configTest)
            let vwapAsk = calculateVWAP(message.data.Asks, configTest)

            let priceData = {
                currencyPair: message.data.Bids[0].currencyPair,
                bid: message.data.Bids[0].price,
                ask: message.data.Asks[0].price,
                timestamp: message.data.LastChange
            };
            // handlePriceUpdate(priceData);
            // console.log('vwapBid',vwapBid, message.data.Bids[0], message.data.Bids[1], message.data.Bids[2], message.data.Bids[3])
            // console.log('vwapAsks',vwapAsk, message.data.Asks[0], message.data.Asks[1], message.data.Asks[2], message.data.Asks[3])
        }

    });

    wsConnection.on('error', (err) => {
        console.error(`[${new Date().toISOString()}] WebSocket error:`, err);
    });

    wsConnection.on('close', () => {
        console.log(`[${new Date().toISOString()}] WebSocket connection closed`);
    });
}

// Ping-Pong mechanism to keep the connection alive
function startPingPong(ws) {
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
        } else {
            clearInterval(pingInterval);
        }
    }, 25000); // Ping every 25 seconds to keep the connection alive
}

// Export the functions: streamPrices, placeOrder, and cancelOrder
// module.exports = {
//     streamPrices,
//     placeOrder,
//     cancelOrder
// };
streamPrices()