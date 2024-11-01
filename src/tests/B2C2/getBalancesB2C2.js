const axios = require('axios');
require('dotenv').config({ path: '../../config/.env' });


// Set headers, including the authorization token
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Token ${process.env.B2C2_TOKEN}`
};

// Function to get balances
async function getBalances() {
    try {
        const response = await axios.get('https://api.b2c2.net/balance/', {
            headers: headers
        });
        const balances = response.data;
        console.log('balances',balances)
        return balances
    } catch (error) {
        if (error.response) {
            // If the server responded with a status other than 2xx
            const { status, data } = error.response;
            console.error(`HTTP error! status: ${status}, message: ${data.message || data}`);
        } else {
            // If the request was made but no response was received or an error occurred during setting up the request
            console.error('Error:', error.message);
        }
    }
}
getBalances();
