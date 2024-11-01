const axios = require('axios');
const getTokens = require('./getTokens'); 
require('dotenv').config({ path: '../../../config/.env' });

const apiKey = process.env.IG_DEMO_API;

async function checkDeal(dealReference) {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('IG Failed to obtain tokens, cannot confirm deal.');
        return;
    }

    const { cst, xSecurityToken } = tokens;

    try {
        const response = await axios.get(`https://demo-api.ig.com/gateway/deal/confirms/${dealReference}`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-IG-API-KEY': apiKey,
                'CST': cst,
                'X-SECURITY-TOKEN': xSecurityToken,
                'Version': '1'
            }
        });

        if (response.data && response.data.reason !== 'SUCCESS') {
            console.error('Error: Deal failed. Exiting process.');
            console.log('Deal Confirmation:', response.data);
            process.exit(1); 
        } else {
            dealId = response.data.dealId
            console.log('DealId from IG', dealId)
            return dealId
        }

    } catch (error) {
        console.error('Error confirming deal:', error.response ? error.response.data : error.message);
    }
}

module.exports = checkDeal;
