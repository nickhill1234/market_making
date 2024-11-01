require('dotenv').config({ path: '../../config/.env' });
const axios = require('axios');
const crypto = require('crypto');

function signRequest(apiSecret, timestamp, verb, path, body = '') {
    const hmac = crypto.createHmac('sha512', apiSecret);
    hmac.update(timestamp.toString());
    hmac.update(verb.toUpperCase());
    hmac.update(path);
    hmac.update(body);
    return hmac.digest('hex');
}

async function getOrderStatus(currencyPair, OrderId) {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = Date.now();
    const path = `/v1/orders/${currencyPair}/orderid/${OrderId}`;
    const verb = 'GET';

    const signature = signRequest(apiSecret, timestamp, verb, path);

    const headers = {
        'X-VALR-API-KEY': apiKey,
        'X-VALR-SIGNATURE': signature,
        'X-VALR-TIMESTAMP': timestamp.toString()
    };

    try {
        const response = await axios.get(`https://api.valr.com/v1/orders/${currencyPair}/orderid/${OrderId}`, { headers });
        console.log('Order status:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching order status:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = getOrderStatus;

getOrderStatus('ETHZAR', 'c1fb80de-ab00-47ad-9838-961a2647069b').catch(console.error);
