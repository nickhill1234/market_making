require('dotenv').config({ path: '../../../config/.env' });
const WebSocket = require('ws');
const crypto = require('crypto');
const { parentPort } = require('worker_threads');

function signRequest(apiSecret, timestamp, verb, path, body = '') {
    const hmac = crypto.createHmac('sha512', apiSecret);
    hmac.update(timestamp.toString());
    hmac.update(verb.toUpperCase());
    hmac.update(path);
    hmac.update(body);
    return hmac.digest('hex');
}

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

function streamPrices(handlePriceUpdateVALR, attempt = 0) {
    const path = '/ws/trade';  // The WebSocket path for trading
    const url = `wss://api.valr.com${path}`;    
    
    const headers = getAuthHeaders(path);

    const wsMarket = new WebSocket(url, { headers });

    let timeoutId;
    let hasReceivedInitialMessage = false;

    const resetTimeout = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            if (!hasReceivedInitialMessage) {
                console.log(`[${new Date().toISOString()}] VALR Prices || No new data received in past 5 seconds, reconnecting...`);
                wsMarket.terminate();
                streamPrices(handlePriceUpdateVALR, attempt + 1);
            }
        }, 5000); // Timeout set to 5 seconds
    };

    const reconnect = () => {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff with max delay of 30 seconds
        console.log(`[${new Date().toISOString()}] VALR Prices || Attempting to reconnect in ${delay / 1000} seconds...`);
        setTimeout(() => {
            console.log(`[${new Date().toISOString()}] VALR Prices || Reconnect attempt #${attempt + 1}`);
            streamPrices(handlePriceUpdateVALR, attempt + 1);
        }, delay);
    };

    wsMarket.on('open', () => {
        const cancelOnDisconnectMessage = {
            type: 'CANCEL_ON_DISCONNECT',
            payload: {
                cancelOnDisconnect: true // Enable cancel on disconnect
            }
        };
        wsMarket.send(JSON.stringify(cancelOnDisconnectMessage));
        console.log(`[${new Date().toISOString()}] VALR Prices || CANCEL_ON_DISCONNECT flag enabled`);

        // Subscription message
        const subscriptionMessage = {
            type: 'SUBSCRIBE',
            subscriptions: [
                {
                    event: 'FULL_ORDERBOOK_UPDATE',
                    pairs: ["BTCUSDTPERP"]
                }
            ]
        };

        // Send subscription message once the connection is open
        wsMarket.send(JSON.stringify(subscriptionMessage));
        console.log(`[${new Date().toISOString()}] VALR Prices || Connected to WebSocket`);
        startPingPong(wsMarket);
        resetTimeout();  
    });

    wsMarket.on('message', (data) => {
        const message = JSON.parse(data);
        console.log(message)

        if (message.type === 'FULL_ORDERBOOK_UPDATE') {
            // hasReceivedInitialMessage = true; // Mark that we've received the initial message
            // let priceData = {
            //     // currencyPair: message.data.Bids[0].currencyPair,
            //     bid: message.data.Bids[0].price,
            //     ask: message.data.Asks[0].price,
            //     // timestamp: message.data.LastChange
            // };
            timeStart = Date.now()
            serverTime = message.data.LastChange
            bidPrice = message.data.Bids?.[0]?.Price ?? 'no price';
            bidQty = message.data.Bids?.[0]?.Orders[0].quantity ?? 'no qty';
            askPrice = message.data.Asks?.[0]?.Price ?? 'no price';
            askQty = message.data.Asks?.[0]?.Orders[0].quantity ?? 'no qty';
            data = ['FOB',bidPrice, bidQty, askPrice, askQty, serverTime, timeStart]
            // parentPort.postMessage(data.join(','));
            resetTimeout();
            attempt = 0;
        }
    });

    wsMarket.on('error', (err) => {
        console.error('VALR Prices || WebSocket error:', err);
        reconnect();
    });

    wsMarket.on('close', (code, reason) => {
        console.error(`VALR Prices || WebSocket closed with code: ${code}, reason: ${reason || 'No reason provided'}`);
        reconnect();
    });
}

function startPingPong(ws) {
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
        } else {
            clearInterval(pingInterval);
        }
    }, 25000); // Ping every 25 seconds to ensure connection is kept alive
}

streamPrices();