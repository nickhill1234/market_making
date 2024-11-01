require('dotenv').config({ path: '../../config/.env' });
const axios = require('axios');
const crypto = require('crypto');

function signRequest(apiSecret, timestamp, verb, path, body = '') {
    return crypto
        .createHmac('sha512', apiSecret)
        .update(timestamp.toString())
        .update(verb.toUpperCase())
        .update(path)
        .update(body)
        .digest('hex');
}

async function getOpenOrders() {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = Date.now();
    const path = '/v1/orders/open';
    const verb = 'GET';

    const signature = signRequest(apiSecret, timestamp, verb, path);

    try {
        const response = await axios.get(`https://api.valr.com${path}`, {
            headers: {
                'X-VALR-API-KEY': apiKey,
                'X-VALR-SIGNATURE': signature,
                'X-VALR-TIMESTAMP': timestamp.toString(),
            }
        });

        const openOrders = response.data;
        const openOrder = openOrders.filter(order => order.currencyPair === 'XRPZAR' && order.side ==='sell');
        console.log('open order', openOrder)
        return openOrder;
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            switch (status) {
                case 400:
                    console.error('Code 400: Failed to fetch open orders:', data.message);
                    return null;
                case 401:
                    console.error('Code 401: Unauthorized:', data.message);
                    return null;
                default:
                    console.error(`Code ${status}: Failed to fetch open orders:`, data);
                    return null;
            }
        } else {
            console.error('Error fetching open orders:', error.message);
            return null;
        }
    }
}

getOpenOrders();
