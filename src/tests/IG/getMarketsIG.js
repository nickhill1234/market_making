const axios = require('axios');
const getTokens = require('../utils/getTokens'); 
require('dotenv').config({ path: '../../config/.env' });

const apiKey = process.env.IG_DEMO_API;
const marketId = '264141' // 264139 Forex (mini). //  Leave blank if you need all nodes

async function getAllEmergingMarketsFX() {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, cannot confirm deal.');
        return;
    }

    const { cst, xSecurityToken } = tokens;

    try {
        const response = await axios.get(`https://demo-api.ig.com/gateway/deal/marketnavigation/${marketId}`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-IG-API-KEY': apiKey,
                'CST': cst,
                'X-SECURITY-TOKEN': xSecurityToken
            }
        });

        console.log('All Emerging Markets FX:', response.data);
    } catch (error) {
        console.error('Error retrieving all Emerging Markets FX:', error.response ? error.response.data : error.message);
    }
}

getAllEmergingMarketsFX();