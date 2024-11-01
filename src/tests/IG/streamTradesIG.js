const getTokens = require('./getTokens'); 
require('dotenv').config({ path: '../../config/.env' });
const { LightstreamerClient, Subscription } = require('lightstreamer-client');

function connectToLightstreamer(cst, xSecurityToken, activeAccountId, lightstreamerEndpoint) {
    const lsClient = new LightstreamerClient(lightstreamerEndpoint);

    lsClient.connectionDetails.setUser(activeAccountId);
    lsClient.connectionDetails.setPassword(`CST-${cst}|XST-${xSecurityToken}`);
    lsClient.addListener({
        onListenStart: function() {
            console.log('ListenStart for Trades');
        },
        onStatusChange: function(status) {
            console.log('Lightstreamer connection status:', status);
        }
    });

    lsClient.connect();

    return lsClient;
}

function subscribeToTrades(lsClient, activeAccountId, onTradeUpdate) {
    const itemList = [`TRADE:${activeAccountId}`];
    const fieldList = ["CONFIRMS"];

    // Create a subscription
    const subscription = new Subscription("DISTINCT", itemList, fieldList);

    subscription.addListener({
        onSubscription: function() {
            console.log('Subscribed to trades');
        },
        onUnsubscription: function() {
            console.log('Unsubscribed from trades');
        },
        onSubscriptionError: function(code, message) {
            console.log('Subscription failure:', code, 'message:', message);
        },
        onItemUpdate: updateInfo => {
            const tradeData = updateInfo.Sd[2];
            const confirms = JSON.parse(tradeData.CONFIRMS);

            console.log('test',confirms)
        },
    });

    lsClient.subscribe(subscription);

    return subscription;
}

async function streamTrades() {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, cannot confirm deal.');
        return;
    }

    const { cst, xSecurityToken, activeAccountId, lightstreamerEndpoint } = tokens;
    const lsClient = connectToLightstreamer(cst, xSecurityToken, activeAccountId, lightstreamerEndpoint);
    subscribeToTrades(lsClient, activeAccountId);
}

streamTrades();
