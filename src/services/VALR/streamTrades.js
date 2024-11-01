require('dotenv').config({ path: '../../../config/.env' });
const WebSocket = require('ws');
const crypto = require('crypto');

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

// Store the WebSocket connection globally
let wsConnection;

// Connect to the account WebSocket to receive account updates
function connectToAccount(onAccountUpdate) {
    const path = '/ws/account';
    const url = `wss://api.valr.com${path}`;
    const headers = getAuthHeaders(path);

    wsConnection = new WebSocket(url, { headers });

    wsConnection.on('open', () => {
        const cancelOnDisconnectMessage = {
            type: 'CANCEL_ON_DISCONNECT',
            payload: {
                cancelOnDisconnect: true // Enable cancel on disconnect
            }
        };
    
        wsConnection.send(JSON.stringify(cancelOnDisconnectMessage));    
        console.log(`[${new Date().toISOString()}] VALR Trades || Connected to WebSocket`);
        startPingPong(wsConnection); 
    });

    wsConnection.on('message', (data) => {
        const message = JSON.parse(data);
        onAccountUpdate(message);
    });

    wsConnection.on('error', (err) => {
        console.log(`[${new Date().toISOString()}] VALR Trades || WebSocket error:`, err);
        process.exit(1); // Shut down bot if we do not receive trades
    });

    wsConnection.on('close', (code) => {
        console.log('Websocket account closed',code)
        onAccountUpdate(code);
        setTimeout(() => connectToAccount(onAccountUpdate), 5000); 
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
    }, 20000); 
}

function placeMarketOrder(side, pair, size, orderId) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        const placeOrderMessage = {
            type: 'PLACE_MARKET_ORDER',
            payload: {
                side: side, // BUY or SELL
                pair: pair, // Trading pair, e.g., BTCUSDT
                baseAmount: size.toString(), // Quantity to trade
                customerOrderId: orderId, // Unique order ID
                allowMargin: false
            }
        };
        
        wsConnection.send(JSON.stringify(placeOrderMessage));
        // console.log(`[${new Date().toISOString()}] WS Order placed:`, placeOrderMessage);
    } else {
        console.error(`[${new Date().toISOString()}] VALR Trades WebSocket connection is not open. Cannot place MARKET order.`);
    }
}

// Place a limit order using the existing WebSocket connection
function placeLimitOrder(side, priceUsed, config, referencePrices, filledSize) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        let allowMargin = config.allowMarginVALR;
        if (config.primary_market.includes('ZAR') && side === 'BUY') {
          allowMargin = false;
        }
        const placeOrderMessage = {
            type: 'PLACE_LIMIT_ORDER',
            payload: {
                side: side, // BUY or SELL
                pair: config.primary_market, // Trading pair, e.g., BTCUSDT
                quantity: ((filledSize !== 0) ? (config.min_order - filledSize) : config.min_order).toString(), // Quantity to trade
                price: priceUsed.toString(), // Limit price
                postOnly: true,
                customerOrderId: referencePrices.toString(), // Unique order ID
                timeInForce: "GTC",
                allowMargin: allowMargin,
                postOnlyReprice: true
            }
        };        
        wsConnection.send(JSON.stringify(placeOrderMessage));
        // console.log(`[${new Date().toISOString()}] Order placed:`, placeOrderMessage);
    } else {
        console.error(`[${new Date().toISOString()}] VALR Trades || WebSocket connection is not open. Cannot place order.`);
    }
}

// Cancel a limit order using the existing WebSocket connection
function cancelOrder(orderId, pair) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        const cancelOrderMessage = {
            type: 'CANCEL_LIMIT_ORDER',
            payload: {
                orderId, // The ID of the order to cancel
                pair     // Trading pair, e.g., BTCUSDT
            }
        };

        wsConnection.send(JSON.stringify(cancelOrderMessage));
    } else {
        console.error(`[${new Date().toISOString()}] VALR Trades | Connection is not open. Cannot cancel order.`);
    }
}

// Stream account updates and handle WebSocket reconnections
async function streamAccountUpdates(onAccountUpdate) {
    connectToAccount(onAccountUpdate);
}

// Export the functions: streamAccountUpdates, placeOrder, and cancelOrder
module.exports = {
    streamAccountUpdates,
    placeLimitOrder,
    cancelOrder,
    placeMarketOrder
};
