const { LightstreamerClient, Subscription } = require('lightstreamer-client');
const getTokens = require('../utils/getTokens'); 

function connectToLightstreamer(tokens) {

    const { cst, xSecurityToken, activeAccountId, lightstreamerEndpoint } = tokens;
    const lsClient = new LightstreamerClient(lightstreamerEndpoint);

    // Set up login credentials
    lsClient.connectionDetails.setUser(activeAccountId);
    lsClient.connectionDetails.setPassword(`CST-${cst}|XST-${xSecurityToken}`);
    lsClient.addListener({
        onListenStart: function() {
            console.log('ListenStart for Prices');
        },
        onStatusChange: function(status) {
            console.log('Lightstreamer connection status:', status);
        }
    });

    // Connect to Lightstreamer
    lsClient.connect();

    return lsClient;
}

function subscribeToPrices(lsClient) {
    const itemList = [`MARKET:CS.D.USDZAR.MINI.IP`];
    const fieldList = ["BID", "OFFER","UPDATE_TIME","MARKET_STATE"];

    // Create a subscription
    const subscription = new Subscription("MERGE", itemList, fieldList);

    subscription.addListener({
        onSubscription: function() {
            console.log('Subscribed to IG prices');
        },
        onUnsubscription: function() {
            console.log('Unsubscribed from prices');
        },
        onSubscriptionError: function(code, message) {
            console.log('Subscription failure:', code, 'message:', message);
        },
        onItemUpdate: function(updateInfo) {
            const priceData = {};
            updateInfo.forEachField(function(fieldName, fieldPos, value) {
                priceData[fieldName] = value;
            });
            console.log('price data', priceData)        
        }
    });

    // Subscribe to Lightstreamer
    lsClient.subscribe(subscription);

    // return subscription;
}

async function streamPrices() {
    const tokens = await getTokens();
    if (!tokens) {
        console.error('Failed to obtain tokens, exiting.');
        return;
    }

    const lsClient = connectToLightstreamer(tokens);
    subscribeToPrices(lsClient);
}

streamPrices();
