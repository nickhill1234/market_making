const WebSocket = require('ws');

// Create a new WebSocket connection to the Bybit WebSocket server
const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear');

// Define a function to handle incoming messages
ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    delay = Date.now()-message.ts
    console.log('ws bybit delay',delay)
    if(message.success){
        console.log('Successfully connected to Bybit');
    }
    if(message.type === 'snapshot'){
        console.log('first bid',message.data.b)
        console.log('first ask',message.data.a)
    }
    if (message.data) {
        if (message.data.b && message.data.b.length > 0) {
            // const highestBidPrice = Math.max(...message.data.b.map(item => parseFloat(item[0])));
            // console.log('Bid:', message.ts);
        }
        if (message.data.a && message.data.a.length > 0) {
            // const lowestAskPrice = Math.min(...message.data.a.map(item => parseFloat(item[0])));
            // console.log('Ask:', lowestAskPrice);
        }
    }
};

// Define a function to handle WebSocket open event
ws.onopen = function() {
    // Send a subscription message to the WebSocket server
    const subscribeMessage = {
        "op": "subscribe",
        "args": [
                "orderbook.1.BTCUSDT"
        ]
    };
    ws.send(JSON.stringify(subscribeMessage));
    startPingPong(ws)
};

// Define a function to handle WebSocket close event
ws.onclose = function() {
    console.log('WebSocket connection closed');
};

// Define a function to handle WebSocket error event
ws.onerror = function(error) {
    console.error('WebSocket error:', error);
};

function startPingPong(ws) {
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
        } else {
            clearInterval(pingInterval);
        }
    }, 25000); // Ping every 25 seconds to ensure connection is kept alive
}
