const axios = require('axios');
const getTokens = require('../utils/getTokens'); 
require('dotenv').config({ path: '../../config/.env' });

const apiKey = process.env.IG_DEMO_API;

async function placeMarketOrder(executedSide) {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, cannot place order.');
        return;
    }

    const { cst, xSecurityToken } = tokens;

    try {
        const response = await axios.post('https://demo-api.ig.com/gateway/deal/positions/otc', {
            epic:'CS.D.USDZAR.MINI.IP', 
            expiry: '-', // For non-expiring instruments, use '-'
            direction: executedSide, // 'BUY' or 'SELL'
            size: 1, // Deal size
            orderType: 'MARKET', // 'MARKET', 'LIMIT', 'STOP'
            timeInForce: 'FILL_OR_KILL',
            level: null,
            guaranteedStop: false,
            stopLevel: null, // Optional stop level
            stopDistance: null, // Stop distance in points
            trailingStop: null,
            trailingStopIncrement: null,
            forceOpen: true,
            limitLevel: null, // Optional limit level
            limitDistance: null, // Limit distance in points
            quoteId: null,
            currencyCode: 'ZAR',
            dealReference: 'testingref1'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-IG-API-KEY': apiKey,
                'CST': cst,
                'X-SECURITY-TOKEN': xSecurityToken,
                'Version': '2'
            }
        });

        console.log('Order Response:', response.data.dealReference);
        dealId = response.data.id
        return dealId
    } catch (error) {
        console.error('Error placing order:', error.response ? error.response.data : error.message);
    }
}
placeMarketOrder("BUY");
