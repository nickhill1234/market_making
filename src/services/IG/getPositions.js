const axios = require('axios');
const getTokens = require('./getTokens'); 
require('dotenv').config({ path: '../../../config/.env' });

const apiKey = process.env.IG_DEMO_API;

async function getOpenPositions() {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, cannot get positions.');
        return;
    }

    const { cst, xSecurityToken, activeAccountId } = tokens;

    try {
        const response = await axios.get('https://demo-api.ig.com/gateway/deal/positions', {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-IG-API-KEY': apiKey,
                'CST': cst,
                'X-SECURITY-TOKEN': xSecurityToken,
                'IG-ACCOUNT-ID': activeAccountId
            }
        });

        positions = response.data.positions
        return positions;

    } catch (error) {
        if (error.response) {
            console.log(`[${new Date().toISOString()} Error getting positions:`, {
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

module.exports = getOpenPositions;
