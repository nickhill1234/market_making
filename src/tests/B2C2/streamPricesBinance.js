const WebSocket = require('ws');

function streamPrices(config, handlePriceUpdateBinance, attempt = 0) {
    // Create a new WebSocket connection to the Binance Futures WebSocket server
    const ws = new WebSocket(`wss://fstream.binance.com/ws/!bookTicker`);
    let pingInterval;

    const reconnect = () => {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff with max delay of 30 seconds
        console.log(`[${new Date().toISOString()}] Binance || Attempting to reconnect in ${delay / 1000} seconds...`);
        
        setTimeout(() => {
            console.log(`[${new Date().toISOString()}] Binance || Reconnect attempt #${attempt + 1}`);
            streamPrices(config, handlePriceUpdateBinance, attempt + 1); // Retry connecting
        }, delay);
    };

    // Define a function to handle incoming messages
    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);

        // Check if it's a valid bookTicker message
        if (message.e === 'bookTicker') {
            if(message.s === 'BTCUSDT'){
                const priceData = {
                    bid: parseFloat(message.b),  // Best bid price
                    ask: parseFloat(message.a),  // Best ask price
                };
                handlePriceUpdateBinance(priceData); // Pass price data to the handler function
            }
        }
    };
    // Define a function to handle WebSocket open event
    ws.onopen = function() {
        attempt = 0; // Reset the reconnection attempts on successful connection
        console.log(`[${new Date().toISOString()}] Binance || Successfully connected to WebSocket for market ${config.cancel_market_3}`);

        startPingPong(ws); // Start ping-pong to keep the connection alive
    };

    // Define a function to handle WebSocket close event
    ws.onclose = function() {
        console.log(`[${new Date().toISOString()}] Binance || WebSocket connection closed`);
        clearInterval(pingInterval); // Clear ping interval on close
        reconnect(); // Attempt to reconnect
    };

    // Define a function to handle WebSocket error event
    ws.onerror = function(error) {
        console.error(`[${new Date().toISOString()}] Binance || WebSocket error:`, error);
        clearInterval(pingInterval); // Clear ping interval on error
        reconnect(); // Attempt to reconnect
    };
}

function startPingPong(ws) {
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 'ping' })); // Send a ping to keep the connection alive
        } else {
            clearInterval(pingInterval); // Stop pinging if the connection is not open
        }
    }, 25000); // Ping every 25 seconds
}

module.exports = streamPrices;
