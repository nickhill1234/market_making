const axios = require('axios');
const getTokens = require('./getTokens'); 
require('dotenv').config({ path: '../../../config/.env' });

const apiKey = process.env.IG_DEMO_API;

async function placeMarketOrder(executedSide, executedOrderID) {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, cannot place order.');
        return;
    }

    const { cst, xSecurityToken } = tokens;

    const randomString = Array.from({ length: 7 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 52)]).join('');

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
            dealReference: randomString
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

        dealReference = response.data.dealReference
        return dealReference
    } catch (error) {
        console.error('Error placing order:', error.response ? error.response.data : error.message);
    }
}

module.exports = placeMarketOrder;
