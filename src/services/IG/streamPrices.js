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
            // console.log(`[${new Date().toISOString()}] IG Price Listen Start`);
        },
        onStatusChange: function(status) {
            console.log(`[${new Date().toISOString()}] IG Price || Lightstreamer connection status:`, status);
        }
    });

    // Connect to Lightstreamer
    lsClient.connect();

    return lsClient;
}

function subscribeToPrices(lsClient, config, onPriceUpdate) {
    const itemList = [`MARKET:${config.hedging_market}`];
    const fieldList = ["BID", "OFFER","UPDATE_TIME","MARKET_STATE"];

    // Create a subscription
    const subscription = new Subscription("MERGE", itemList, fieldList);

    subscription.addListener({
        onSubscription: function() {
            console.log(`[${new Date().toISOString()}] Subscribed to IG prices`);
        },
        onUnsubscription: function() {
            console.log(`[${new Date().toISOString()}]Unsubscribed from prices`);
        },
        onSubscriptionError: function(code, message) {
            console.log(`[${new Date().toISOString()}] Subscription failure:', code, 'message:`, message);
        },
        onItemUpdate: function(updateInfo) {
            const priceData = {};
            updateInfo.forEachField(function(fieldName, fieldPos, value) {
                priceData[fieldName] = value;
            });
            onPriceUpdate(priceData); 
        }
    });

    // Subscribe to Lightstreamer
    lsClient.subscribe(subscription);

    return subscription;
}

async function streamPrices(config, onPriceUpdate) {
    const lsClient = await connectToLightstreamer();
    subscribeToPrices(lsClient, config, onPriceUpdate);
}

module.exports = streamPrices;
