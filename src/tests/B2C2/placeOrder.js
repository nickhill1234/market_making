require('dotenv').config({ path: '../../config/.env' });
const axios = require('axios');


// Set headers, including the authorization token
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Token ${process.env.B2C2_TOKEN}`
};

// Function to place the order
async function placeOrder(side, size, config) {
    const valid_until = new Date(new Date().getTime() + 2000).toISOString();
    const instrument = `${config.secondary_market}`;
    const currency = config.base_ccy;
    const postData = {
        instrument: instrument,
        currency: 'USTZAR',
        side: 'BUY',
        price:'10',
        quantity: '1',
        client_order_id: '',
        order_type: 'FOK',
        valid_until: valid_until,
    };
    try {
        const response = await axios.post('https://api.b2c2.net/v2/order/', postData, {
            headers: headers
        });

        return response.data
    } catch (error) {
        if (error.response) {
            // If the server responded with a status other than 2xx
            const { status, data } = error.response;
            console.error(`HTTP error! status: ${status}, message: ${JSON.stringify(data)}`);
        } else {
            // If the request was made but no response was received or an error occurred during setting up the request
            console.error('Error:', error.message);
        }
    }
}

module.exports = placeOrder;
