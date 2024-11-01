const { streamAccountUpdates, placeMarketOrder, placeOrder, cancelOrder } = require('./wsAccountVALR');

const config = {
    primary_market: 'USDTZAR',
    cancel_market: 'USDTZARPERP',
};

let orderPlaced = false; // Flag to track if the order has already been placed
let orderId = "6242902b-8df1-4a6a-b033-89ddf6a882e6";

function onAccountUpdate(message) {
    if (message && !orderPlaced) {
        placeOrder(orderDetails);    // Place order only if it hasn't been placed
        orderPlaced = true;          // Set flag to true to prevent future orders
    }

    // Listen for updates related to open orders
    if (message.type === "OPEN_ORDERS_UPDATE") {
        console.log('ORDER UPDATE:', message);
        const orderUpdate = message.data.find(order => order.currencyPair === 'USDCZAR');
        if(orderUpdate){
            orderId = orderUpdate.orderId
        }
        // Optionally cancel the order based on some condition
    }
    if(orderId){
        cancelOrder(orderId, orderDetails.pair);
        orderId = null
    }
    if (message.type === "CANCEL_ORDER_WS_RESPONSE") {
        console.log('CANCEL RESPONSE', message);
    }
}

// function onAccountUpdate(message) {
//     if (message && !orderPlaced) {
//         placeMarketOrder(orderMarketDetails);    // Place order only if it hasn't been placed
//         orderPlaced = true;          // Set flag to true to prevent future orders
//     }
// }
// streamAccountUpdates(onAccountUpdate); //limit orders
streamAccountUpdates(onAccountUpdate);


// Example order details
const orderDetails = {
    side: 'BUY', // Can be 'BUY' or 'SELL'
    pair: 'USDCZAR', // Trading pair
    quantity: "1", // Amount to buy/sell
    price: "10", // Price at which to place the limit order
    postOnly: true, // Optional, indicates whether it's a post-only order
    customerOrderId: '' // Unique ID for the order
};
//market order details
// const orderMarketDetails = {
//     side: 'SELL', // Can be 'BUY' or 'SELL'
//     pair: 'BTCUSDTPERP', // Trading pair
//     quantity: "0.0001", // Amount to buy/sell
//     customerOrderId: 'td88b712d-19c4-4541-9ef5-aa0ca7d0aa01', // Unique ID for the order
// };