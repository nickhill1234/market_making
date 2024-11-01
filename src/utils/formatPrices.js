function formatPrices(calc_limit_bid, calc_limit_ask, config) {
    const numberOfDecimals = (config.minimum_price_tick_size.toString().split('.')[1] || '').length;
    const scaleFactor = Math.pow(10, numberOfDecimals);

    // For bids, we round down
    let scaled_bid = calc_limit_bid * scaleFactor;
    const formatted_limit_bid = Math.floor(scaled_bid) / scaleFactor;

    // For asks, we round up
    let scaled_ask = calc_limit_ask * scaleFactor;
    const formatted_limit_ask = Math.ceil(scaled_ask) / scaleFactor;

    return {
        formatted_limit_bid,
        formatted_limit_ask
    };
}

module.exports = formatPrices;


