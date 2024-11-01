require('dotenv').config({ path: '../../../config/.env' });
const WebSocket = require('ws');
const crypto = require('crypto');
const { parentPort } = require('worker_threads');
const calculateCRC32 = require('../../utils/checkSum');
const adjustOrderbook = require('../../utils/constructOrderbook');

// Function to sign the request
function signRequest(apiSecret, timestamp, verb, path, body = '') {
    const hmac = crypto.createHmac('sha512', apiSecret);
    hmac.update(timestamp.toString());
    hmac.update(verb.toUpperCase());
    hmac.update(path);
    hmac.update(body);
    return hmac.digest('hex');
}

// Function to get authentication headers
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

// Order book storage with initial checksum and sequence number
let orderBook = {
    Asks: [],
    Bids: [],
    InitialChecksum: null,
    SequenceNumber: null // Store the sequence number
};

// Function to calculate CRC32 checksum


// Function to update the order book and check checksum
function updateOrderBook(update) {
    const { Asks, Bids, Checksum, SequenceNumber } = update.data;
    console.log('bids array', Bids ? Bids.map(priceLevel => priceLevel.Orders) : [], Checksum);    // Check for missed updates based on sequence numbers
    if (orderBook.SequenceNumber !== null) {
        const expectedSequenceNumber = orderBook.SequenceNumber + Asks.length + Bids.length;
        if (SequenceNumber !== expectedSequenceNumber) {
            console.warn(`[${new Date().toISOString()}] Missed updates! Expected Sequence Number: ${expectedSequenceNumber}, Current: ${SequenceNumber}`);
        }
    }

    // Update the last processed sequence number
    orderBook.SequenceNumber = SequenceNumber;
    console.log('checksum',Checksum)
    // Process Bids
    Bids.forEach(priceLevel => {
        const { Price, Orders } = priceLevel; // Extract Price and Orders for the current price level
        Orders.forEach(order => {
            const { orderId, quantity } = order; // Extract orderId and quantity

            // Update price level if the quantity is zero
            if (parseFloat(quantity) === 0) {
                const priceLevelToUpdate = orderBook.Bids.find(pl => pl.Price === Price);
                if (priceLevelToUpdate) {
                    console.log('Removing order:', priceLevelToUpdate);
                    priceLevelToUpdate.Orders = priceLevelToUpdate.Orders.filter(o => o.orderId !== orderId);
                    console.log('Orders after removal:', priceLevelToUpdate.Orders);
                    // If no orders remain, remove the price level
                    if (priceLevelToUpdate.Orders.length === 0) {
                        console.log(`Removing empty bid price level: ${Price}`);
                        orderBook.Bids = orderBook.Bids.filter(pl => pl.Price !== Price);
                    }
                }
            } else {
                // Update or add the order
                const existingPriceLevel = orderBook.Bids.find(pl => pl.Price === Price);
                if (existingPriceLevel) {
                    const existingOrder = existingPriceLevel.Orders.find(o => o.orderId === orderId);
                    if (existingOrder) {
                        console.log('Updating existing order:', existingOrder, existingPriceLevel);
                        existingOrder.quantity = quantity; // Update the quantity
                    } else {
                        existingPriceLevel.Orders.push({ orderId: orderId, quantity: quantity }); // Add new order
                        console.log('Added new order:', Price, orderId, quantity);
                        const priceLevelToUpdate = orderBook.Bids.find(pl => pl.Price === Price)
                        console.log('check',priceLevelToUpdate)
                    }
                } else {
                    // If the price level does not exist, create it
                    console.log('No existing price level, creating:', Price, orderId, quantity);
                    orderBook.Bids.push({ Price, Orders: [{ orderId: orderId, quantity: quantity }] });
                    const priceLevelToUpdate = orderBook.Bids.find(pl => pl.Price === Price)
                    console.log('check',priceLevelToUpdate)
                }
            }
        });
    });

    // Calculate checksum after updating the order book
    const calculatedChecksum = calculateCRC32(oldOrderBook);

    
    // Check if the calculated checksum matches the received checksum
    if (calculatedChecksum !== Checksum) {
        console.error(`[${new Date().toISOString()}] Checksum mismatch! Calculated: ${calculatedChecksum}, Received: ${Checksum}`);
    } else {
        console.log(`[${new Date().toISOString()}] Checksum verified successfully from Update.${calculatedChecksum}. Received: ${Checksum}`);
    }
}

function streamPrices(handlePriceUpdateVALR, attempt = 0) {
    const path = '/ws/trade';
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
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff
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
                cancelOnDisconnect: true
            }
        };
        wsMarket.send(JSON.stringify(cancelOnDisconnectMessage));
        console.log(`[${new Date().toISOString()}] VALR Prices || CANCEL_ON_DISCONNECT flag enabled`);

        const subscriptionMessage = {
            type: 'SUBSCRIBE',
            subscriptions: [
                {
                    event: 'FULL_ORDERBOOK_UPDATE',
                    pairs: ["BTCZAR"]
                }
            ]
        };

        wsMarket.send(JSON.stringify(subscriptionMessage));
        console.log(`[${new Date().toISOString()}] VALR Prices || Connected to WebSocket`);
        startPingPong(wsMarket);
        resetTimeout();  
    });

    wsMarket.on('message', (data) => {
        const message = JSON.parse(data);
        // Check the message type
        if (message.type === 'FULL_ORDERBOOK_SNAPSHOT') {
            orderBook.Asks = message.data.Asks;
            orderBook.Bids = message.data.Bids;
            orderBook.InitialChecksum = message.data.Checksum; // Store the initial checksum
            orderBook.SequenceNumber = message.data.SequenceNumber; // Store the initial sequence number
            
            // Calculate checksum using the initial order book snapshot
            const initialCalculatedChecksum = calculateCRC32(orderBook);
            console.log('_____________START_____________')
            // Check if the calculated checksum matches the received checksum
            if (initialCalculatedChecksum !== orderBook.InitialChecksum) {
                console.error(`[${new Date().toISOString()}] Initial Checksum mismatch! Calculated: ${initialCalculatedChecksum}, Received: ${orderBook.InitialChecksum}`);
            } else {
                console.log(`[${new Date().toISOString()}] Initial Checksum Snapshot verified successfully! ${initialCalculatedChecksum}, Received: ${orderBook.InitialChecksum}`);
            }

            console.log(`[${new Date().toISOString()}] Initial Checksum stored: ${orderBook.InitialChecksum}`);
        } else if (message.type === 'FULL_ORDERBOOK_UPDATE') {
            hasReceivedInitialMessage = true; // Mark that we received a message
            resetTimeout(); // Reset the timeout since we received data
            updateOrderBook(message); // Update the order book
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
    }, 25000); // Ping every 25 seconds
}

streamPrices();
