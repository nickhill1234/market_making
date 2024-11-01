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

async function placeLimitOrder({ side, priceUsed, orderId, config}) {
    const apiKey = process.env.VALR_API_KEY;
    const apiSecret = process.env.VALR_API_SECRET;
    const timestamp = Date.now();
    const path = '/v2/orders/limit';
    const verb = 'POST';


    const orderData = {
        side,
        quantity: config.min_order,
        price: priceUsed,
        pair: config.primary_market,
        postOnly: true,
        customerOrderId: orderId,
        timeInForce: 'GTC',
        allowMargin: config.allowMarginVALR
    };


    const body = JSON.stringify(orderData);
    const signature = signRequest(apiSecret, timestamp, verb, path, body);

    try {
        const response = await axios.post(`https://api.valr.com${path}`, orderData, {
            headers: {
                'Content-Type': 'application/json',
                'X-VALR-API-KEY': apiKey,
                'X-VALR-SIGNATURE': signature,
                'X-VALR-TIMESTAMP': timestamp.toString()
            }
        });
        order_id = response.data.id
        order_status = response.status
        return {order_id, order_status};
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            switch (status) {
                case 400:
                    // console.error('Code 400: Failed to place order:', data.message);
                    return { order_status: 400, message: data.message };
                default:
                    console.error(`Code ${status}: Failed to place order:`, data);
                    return { order_status: status, message: data.message };
            }
        } else {
            console.error('Error placing order:', error.message);
        }
    }
}

module.exports = placeLimitOrder;

