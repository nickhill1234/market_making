require('dotenv').config({ path: '../../config/.env' });
const WebSocket = require('ws');
const crypto = require('crypto');

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

function connectToAccount() {
    const path = '/ws/account';
    const url = `wss://api.valr.com${path}`;
    const headers = getAuthHeaders(path);
    
    const wsAccount = new WebSocket(url, { headers });

    wsAccount.on('open', () => {
        console.log('Connected to VALR Account WebSocket');
        startPingPong(wsAccount); 
    });

    wsAccount.on('message', (data) => {
        const message = JSON.parse(data);
        console.log('message',message)
        if (message.type === 'OPEN_ORDERS_UPDATE') {
            console.log('Order Status Update:', message);
        }
    });

    wsAccount.on('error', (err) => {
        console.error('WebSocket error:', err);
    });

    wsAccount.on('close', () => {
        console.log('WebSocket connection closed, attempting to reconnect...');
        setTimeout(connectToAccount, 5000); 
    });
}

function startPingPong(ws) {
    const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PING' }));
            console.log('Sent PING to server');
        } else {
            clearInterval(pingInterval);
        }
    }, 30000); 
}

connectToAccount();
