const WebSocket = require('ws');

const snapshot = {
    bids: null,
    asks: null,
    timestamp: null,
}

function streamPrices(handlePriceUpdateKrakenFutures) {
    // Create a new WebSocket connection to the Kraken Futures WebSocket server
    const ws = new WebSocket('wss://futures.kraken.com/ws/v1');
    let pingInterval;


    // Define a function to handle incoming messages
    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        // Handle successful subscription confirmation
        if (message.event === 'subscribed' && message.feed === 'book') {
            console.log(`[${new Date().toISOString()}] Kraken || Subscribed to market PI_XBTUSD`);
        }

        // Handle snapshot data (initial full order book)
        if (message.feed === 'book_snapshot') {
            snapshot.bids = message.bids
            snapshot.asks = message.asks
        }

        // Handle delta data (updates to the order book)
        if (message.feed === 'book' && message.price) {
            console.log('book',message)
            const { side, price, qty } = message;

            if (side === 'buy') {
                updateOrderBook(snapshot.bids, price, qty, 'desc'); // Update bids
            } else if (side === 'sell') {
                updateOrderBook(snapshot.asks, price, qty, 'asc'); // Update asks
            }
            const priceData = {
                bid: parseFloat(snapshot.bids[0].price),  // Best bid price
                ask: parseFloat(snapshot.asks[0].price),  // Best ask price
                timestamp: message.timestamp //latency
            };
            handlePriceUpdateKrakenFutures(priceData); // Pass price data to the handler function
        }


    };

    // Define a function to handle WebSocket open event
    ws.onopen = function() {
        console.log(`[${new Date().toISOString()}] Kraken || Successfully connected to WebSocket`);

        // Send a subscription message to the WebSocket server for the specified market
        const subscribeMessage = {
            "event": "subscribe",
            "feed": "book",
            "product_ids": ['PI_XBTUSD'] // Subscribe to order book updates for the given market
        };
        ws.send(JSON.stringify(subscribeMessage));

        startPingPong(ws); // Start ping-pong to keep the connection alive
    };

    // Define a function to handle WebSocket close event
    ws.onclose = function() {
        console.log(`[${new Date().toISOString()}] Kraken || WebSocket connection closed`);
        clearInterval(pingInterval); // Clear ping interval on close
    };

    // Define a function to handle WebSocket error event
    ws.onerror = function(error) {
        console.error(`[${new Date().toISOString()}] Kraken || WebSocket error:`, error);
        clearInterval(pingInterval); // Clear ping interval on error
    };

    function updateOrderBook(orderBookSide, price, qty, sortOrder) {
        const priceLevel = orderBookSide.find(order => order.price === price);

        if (qty === 0) {
            // Remove the price level if quantity is 0
            const index = orderBookSide.indexOf(priceLevel);
            if (index > -1) {
                orderBookSide.splice(index, 1);
            }
        } else {
            if (priceLevel) {
                // Update the existing price level
                priceLevel.qty = qty;
            } else {
                // Add a new price level
                orderBookSide.push({ price, qty });
            }
        }

        // Sort the order book side
        orderBookSide.sort((a, b) => sortOrder === 'desc' ? b.price - a.price : a.price - b.price);
    }
}

function startPingPong(ws) {
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'ping' })); // Send a ping to keep the connection alive
        } else {
            clearInterval(pingInterval); // Stop pinging if the connection is not open
        }
    }, 25000); // Ping every 25 seconds
}

module.exports = streamPrices;
