module.exports = {
    primary_market: 'ETHUSDT',
    secondary_market: 'ETHUSDTPERP',
    base_ccy: 'ETH',
    max_position: 0.2, // COIN
    min_order: 0.002, // COIN
    min_hedge_size: 0.0003, //this has to be the same as min_order in tri-arb
    range: 0.002, // perc
    spread_margin: 0.0002, //this should technically be called spread
    base: 0,
    cancellation_drift: 0.0002, 
    placement_drift: 0.0007, 
    minimum_price_tick_size: 0.01, 
    allowMarginVALR: true 
};