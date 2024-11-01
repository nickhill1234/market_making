const axios = require('axios');

// Function to ping the VALR market summary API
async function pingMarketSummary(market) {
    const url = `https://api.valr.com/v1/public/${market}/marketsummary`;

    try {
        const response = await axios.get(url);
        const ask = response.data.askPrice
        const bid = response.data.bidPrice
        return { bid, ask }
    } catch (error) {
        if (error.response) {
            console.error('Error response:', error.response.data);
            return {};
        } else if (error.request) {
            console.error('Error request:', error.request);
            return {};
        } else {
            console.error('Error message:', error.message);
            return {};
        }
    }
}

module.exports = pingMarketSummary;
