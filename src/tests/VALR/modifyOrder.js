require('dotenv').config({ path: '../../../config/.env' });
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

async function modifyOrder(orderId, pair, newPrice ) {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = Date.now();
    const path = '/v2/orders/modify';
    const verb = 'PUT';

    // Construct the data object with the required and optional fields
    const orderData = {
        orderId,
        pair,
        modifyMatchStrategy: 'RETAIN_ORIGINAL', // keeps the original order as opposed to cancelling it
        newPrice,
    };

    // Filter out undefined values to avoid sending them in the request body
    const filteredOrderData = Object.fromEntries(Object.entries(orderData).filter(([_, v]) => v != null));
    const body = JSON.stringify(filteredOrderData);
    const signature = signRequest(apiSecret, timestamp, verb, path, body);
    try {
        const response = await axios.put(`https://api.valr.com${path}`, filteredOrderData, {
            headers: {
                'Content-Type': 'application/json',
                'X-VALR-API-KEY': apiKey,
                'X-VALR-SIGNATURE': signature,
                'X-VALR-TIMESTAMP': timestamp.toString()
            }
        });

        return {
            status: response.status
        };
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            console.log('error', status, data.message)
            return {
                status,
                message: data.message || 'Failed to modify order'
            };
        } else {
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}

module.exports = modifyOrder;
