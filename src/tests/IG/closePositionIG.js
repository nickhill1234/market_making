const axios = require('axios');
const getTokens = require('./getTokens'); 
require('dotenv').config({ path: '../../config/.env' });

const apiKey = process.env.IG_DEMO_API;

async function closePosition() {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, cannot close position.');
        return;
    }

    const { cst, xSecurityToken, activeAccountId } = tokens;

    try {
        const response = await axios.post('https://demo-api.ig.com/gateway/deal/positions/otc', {
                dealId: 'DIAAAAQ2GXBFSAY', // Deal ID of the position to close
                epic: null, // EPIC for the position to close
                expiry: '-', // Use '-' for non-expiring positions
                direction: 'SELL', 
                size: 1, // Size of the position to close
                level: null, // Optional, set to null
                orderType: 'MARKET', // Market / Limit / Quote
                timeInForce: null,
                quoteId: null // Optional, set to null
            }, {
                headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-IG-API-KEY': apiKey,
                'CST': cst,
                'X-SECURITY-TOKEN': xSecurityToken,
                'IG-ACCOUNT-ID': activeAccountId,
                'Version': '1',
                '_method': 'DELETE' // This is the key part

            },
        });

        console.log('Close Position Response:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error closing position:', {
                data: error.response.data,
                status: error.response.status,
                headers: error.response.headers,
            });
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error setting up request:', error.message);
        }
    }
}

closePosition();
