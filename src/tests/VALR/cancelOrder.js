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

async function CancelOrder(orderId, market) {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = Date.now();
    const path = `/v2/orders/order`;
    const verb = 'DELETE';

    const bodyData = {
        orderId,
        pair: market,
    };

    const body = JSON.stringify(bodyData);
    const signature = signRequest(apiSecret, timestamp, verb, path, body);
    
    try {
        const response = await axios.delete(`https://api.valr.com${path}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VALR-API-KEY': apiKey,
                'X-VALR-SIGNATURE': signature,
                'X-VALR-TIMESTAMP': timestamp.toString()
            },
            data: bodyData // Include body data for the DELETE request
        });

        const order_status = response.status;
        return order_status;
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            switch (status) {
                case 400:
                    console.error('Code 400: Failed to cancel order:', data.message, 'orderId',orderId);
                    return status;
                case 401:
                    console.error('Code 401: Failed to cancel order:', data.message);
                    return status;
                default:
                    console.error(`Code ${status}: Failed to cancel order:`, data);
                    return status;
            }
        } else {
            console.error('Error cancelling order:', error.message);
        }
    }
}
module.exports = CancelOrder;

