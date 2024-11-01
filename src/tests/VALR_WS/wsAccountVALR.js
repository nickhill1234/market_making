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
        console.log(`[${new Date().toISOString()}] VALR Trades || CANCEL_ON_DISCONNECT flag enabled`);
    
        console.log(`[${new Date().toISOString()}] VALR Trades || Connected to WebSocket`);
        startPingPong(wsConnection); 
    });

    wsConnection.on('message', (data) => {
        const message = JSON.parse(data);
        onAccountUpdate(message);
        if (message.type === 'ORDER_PROCESSED') {
            console.log('Trade status', message.data.success)
            console.log('Trade customerId', message.data.customerOrderId)
        }
    });

    wsConnection.on('error', (err) => {
        console.log(`[${new Date().toISOString()}] VALR Trades || WebSocket error:`, err);
        process.exit(1); // Shut down bot if we do not receive trades
    });

    wsConnection.on('close', () => {
        console.log(`[${new Date().toISOString()}] VALR Trades || Connection closed, attempting to reconnect...`);
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
    }, 25000); 
}
function placeMarketOrder(orderDetails) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        const placeOrderMessage = {
            type: 'PLACE_MARKET_ORDER',
            payload: {
                side: orderDetails.side, // BUY or SELL
                pair: orderDetails.pair, // Trading pair, e.g., BTCUSDT
                baseAmount: orderDetails.quantity, // Quantity to trade
                customerOrderId: orderDetails.customerOrderId, // Unique order ID
                allowMargin: false
            }
        };
        
        wsConnection.send(JSON.stringify(placeOrderMessage));
        console.log(`[${new Date().toISOString()}] Order placed:`, placeOrderMessage);
    } else {
        console.error('WebSocket connection is not open. Cannot place order.');
    }
}

// Place a limit order using the existing WebSocket connection
function placeOrder(orderDetails) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        const placeOrderMessage = {
            type: 'PLACE_LIMIT_ORDER',
            payload: {
                side: orderDetails.side, // BUY or SELL
                pair: orderDetails.pair, // Trading pair, e.g., BTCUSDT
                quantity: orderDetails.quantity, // Quantity to trade
                price: orderDetails.price, // Limit price
                postOnly: orderDetails.postOnly || false, // Optional: Post-only flag
                customerOrderId: orderDetails.customerOrderId // Unique order ID
            }
        };
        
        wsConnection.send(JSON.stringify(placeOrderMessage));
        console.log(`[${new Date().toISOString()}] Order placed:`, placeOrderMessage);
    } else {
        console.error('WebSocket connection is not open. Cannot place order.');
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
        console.log(`[${new Date().toISOString()}] Cancel request sent for order ${orderId} on pair ${pair}`);
    } else {
        console.error('WebSocket connection is not open. Cannot cancel order.');
    }
}

// Stream account updates and handle WebSocket reconnections
async function streamAccountUpdates(onAccountUpdate) {
    connectToAccount(onAccountUpdate);
}

// Export the functions: streamAccountUpdates, placeOrder, and cancelOrder
module.exports = {
    streamAccountUpdates,
    placeOrder,
    cancelOrder,
    placeMarketOrder
};
