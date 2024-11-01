const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: '../../../config/.env' });

const username = process.env.IG_USERNAME;
const password = process.env.IG_PASSWORD;
const api_key = process.env.IG_DEMO_API;

async function getTokens() {
    try {
        const response = await axios.post('https://demo-api.ig.com/gateway/deal/session', {
            identifier: username,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-IG-API-KEY': api_key,
                'Version': '2'
            }
        });

        const cst = response.headers['cst'];
        const xSecurityToken = response.headers['x-security-token'];
        const lightstreamerEndpoint = response.data.lightstreamerEndpoint;
        const activeAccountId = response.data.currentAccountId;

        
        return { cst, xSecurityToken, lightstreamerEndpoint, activeAccountId  };
    } catch (error) {
        console.error('Error obtaining tokens:', error.response ? error.response.data : error.message);
    }
}

module.exports = getTokens;
