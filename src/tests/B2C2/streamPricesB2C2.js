const WebSocket = require('ws');
require('dotenv').config({ path: '../../config/.env' });

const wsUrl = 'wss://socket.b2c2.net/quotes';
const headers = {
    'Authorization': `Token ${process.env.B2C2_TOKEN}` 
};

const streamPrices = (config, handlePriceUpdateB2C2, attempt = 0) => {
    const instrument = `${config.secondary_market}`;
    const ws = new WebSocket(wsUrl, { headers });
    // if connection problem persists, consider adding a handshake timeout
    // const ws = new WebSocket(wsUrl, {
    //     headers,
    //     handshakeTimeout: 30000 // 30 seconds timeout for TLS handshake
    // });

    let timeoutId;
    let hasReceivedInitialMessage = false;
    let reconnecting = false;

    const resetTimeout = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            if (!hasReceivedInitialMessage) {
                console.log(`[${new Date().toISOString()}] B2C2 || No new data received in past 5 seconds for B2C2, reconnecting...`);
                ws.terminate();
                reconnect();
            }
        }, 5000); 
    };

    const reconnect = () => {
        if (reconnecting) return;
        reconnecting = true;
        const delay = Math.min(5000 * Math.pow(2, attempt), 30000);
        console.log(`[${new Date().toISOString()}] B2C2 Attempting to reconnect in ${delay / 1000} seconds...`);
        setTimeout(() => {
            console.log(`[${new Date().toISOString()}] B2C2 Reconnect attempt #${attempt + 1}`);
            reconnecting = false;
            streamPrices(config, handlePriceUpdateB2C2, attempt + 1);
        }, delay);
    };

    ws.on('open', () => {
        const subscribeMessage = {
            event: "subscribe",
            instrument: instrument,
            levels: config.socket_levels,
        };
        ws.send(JSON.stringify(subscribeMessage));
        console.log(`[${new Date().toISOString()}] B2C2 || Websocket connection sent for instrument:`, instrument);
        resetTimeout(); // resets 5 second timer
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.levels && message.levels.buy && message.levels.sell) {
            hasReceivedInitialMessage = true; // Mark that we've received the initial message
            let priceData = {
                bid: message.levels.sell[0].price,
                ask: message.levels.buy[0].price,
                // timestamp: message.timestamp,
                // connection: message.success
            };
            handlePriceUpdateB2C2(priceData);
            resetTimeout(); // resets 5 second timer
            attempt = 0;
        }
    });

    ws.on('error', (err) => {
        console.error('B2C2 WebSocket error:', err);
        process.exit(1)
    });

    ws.on('close', (code, reason) => {
        console.log(`[${new Date().toISOString()}] B2C2 || WebSocket closed with code: ${code}, reason: ${reason}. Starting reconnection`);
        //set prices to null to cancel orders
        let priceData = 'Cancel'
        if (code === 429 || code === 430 || code === 4000) {
            console.log(`[${new Date().toISOString()}] B2C2 || WebSocket closed with code: ${code}, shutting down bot with reason: ${reason} `);
            process.exit(1)
        } 
        handlePriceUpdateB2C2(priceData);
        reconnect();
    });

    return ws;
};

module.exports = streamPrices;
