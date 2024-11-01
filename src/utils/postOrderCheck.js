function postOrderCheck({formatted_limit_bid, formatted_limit_ask, valrCurrentPrice, config}){
    let post_limit_bid = formatted_limit_bid;
    let post_limit_ask = formatted_limit_ask;
    // Fetch latest market prices
    let market_bid = valrCurrentPrice.primary_market.BID;
    let market_ask = valrCurrentPrice.primary_market.ASK;

    // setting the price slightly below the best price to give the best chance of execution
    //TODO: This needs to be in a formatter as this will be different for assets such as USDT and XRP with decimals
    let desired_bid = parseFloat(market_ask) - parseFloat(config.minimum_price_tick_size);
    let desired_ask = parseFloat(market_bid) + parseFloat(config.minimum_price_tick_size);

    if (market_bid !== undefined && market_bid !== null && formatted_limit_bid > desired_bid) {
        // console.log('BID: Our calculated limit bid',formatted_limit_bid,'is above the market ask',market_ask, 'therefore setting it to one level below ask', desired_bid);
        post_limit_bid = desired_bid;    
    }
    if (market_ask !== undefined && market_ask !== null && formatted_limit_ask < desired_ask) {
        // console.log('ASK: Our calculated limit ask', formatted_limit_ask, 'is below market bid',market_bid, 'therefore setting it to one level below bid', desired_ask);
        post_limit_ask = desired_ask;
    }

    return { post_limit_bid , post_limit_ask}
}

module.exports = postOrderCheck;