const getTokens = require('./getTokens'); 
require('dotenv').config({ path: '../../../config/.env' });

const { LightstreamerClient, Subscription } = require('lightstreamer-client');

async function connectToLightstreamer() {
    const tokens = await getTokens();
    if (!tokens) {
        console.log(`[${new Date().toISOString()}] IG || Failed to obtain tokens, cannot connect to LightStream.`);
        return;
    }

    const { cst, xSecurityToken, activeAccountId, lightstreamerEndpoint } = tokens;
    const lsClient = new LightstreamerClient(lightstreamerEndpoint);

    // Set up login credentials
    lsClient.connectionDetails.setUser(activeAccountId);
    lsClient.connectionDetails.setPassword(`CST-${cst}|XST-${xSecurityToken}`);
    lsClient.addListener({
        onListenStart: function() {
            // console.log('ListenStart for Prices');
        },
        onStatusChange: function(status) {
            console.log(`[${new Date().toISOString()}] IG Trades || Lightstreamer connection status:`, status);
        }
    });

    // Connect to Lightstreamer
    lsClient.connect();

    return {lsClient, activeAccountId};
}

function subscribeToTrades(lsClient, activeAccountId, onTradeUpdate) {
    const itemList = [`TRADE:${activeAccountId}`];
    const fieldList = ["CONFIRMS"];

    // Create a subscription
    const subscription = new Subscription("DISTINCT", itemList, fieldList);
    subscription.addListener({
        onSubscription: function() {
            console.log(`[${new Date().toISOString()}] IG Subscribed to trades`);
        },
        onUnsubscription: function() {
            console.log(`[${new Date().toISOString()}] IG Unsubscribed from trades`);
        },
        onSubscriptionError: function(code, message) {
            console.log(`[${new Date().toISOString()}] IG Subscription failure:`, code, 'message:', message);
        },
        onItemUpdate: updateInfo => {
            const tradeData = {};
            updateInfo.forEachField(function(fieldName, fieldPos, value) {
                tradeData[fieldName] = value;
            });
            const confirms = JSON.parse(tradeData.CONFIRMS);
            onTradeUpdate(confirms); 
        },
    });

    lsClient.subscribe(subscription);

    return subscription;
}

async function streamTrades(onTradeUpdate) {
    const {lsClient, activeAccountId} = await connectToLightstreamer();
    subscribeToTrades(lsClient, activeAccountId, onTradeUpdate);
}

module.exports = streamTrades;
