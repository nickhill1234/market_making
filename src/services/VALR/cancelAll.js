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

async function CancelAll(config) {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = Date.now();
    const path = `/v1/orders/${config.primary_market}`;
    const verb = 'DELETE';

    try {

        const signature = signRequest(apiSecret, timestamp, verb, path);

        const response = await axios.delete(`https://api.valr.com${path}`, {
            headers: {
                'X-VALR-API-KEY': apiKey,
                'X-VALR-SIGNATURE': signature,
                'X-VALR-TIMESTAMP': timestamp.toString(),
                'Content-Type': 'application/json'
            }
        });
        const order_status = response.status;
        return order_status
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            console.error(`Error canceling orders ${status}`, data);
            return order_status
        } else {
            console.error(`Error canceling orders`, error.message);
            return error
        }
    }
}

module.exports = CancelAll;
