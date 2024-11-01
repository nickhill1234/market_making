module.exports = {
    primary_market: 'BTCZAR',
    secondary_market: 'BTCZARPERP',
    base_ccy: 'BTC',
    max_position: 0.12, // COIN
    min_order: 0.002, // COIN
    min_hedge_size: 0.0001, //this has to be the same as min_order in tri-arb
    range: 0.001, // perc
    spread_margin: 0.0003, //this should technically be called spread
    base: 0,
    cancellation_drift: 0.0002, // this is technically our profit margin
    placement_drift: 0.0007, // how close do you want to price to get to the market before you consider cancellations (max >
    minimum_price_tick_size: 1, ///for setting limit orders
    allowMarginVALR: true 
};