module.exports = {
    primary_market: 'BTCUSDC',
    secondary_market: 'BTCUSDTPERP',
    base_ccy: 'BTC',
    max_position: 0.08, // COIN
    min_order: 0.004, // COIN
    min_hedge_size: 0.0001, //this has to be the same as min_order in tri-arb
    range: 0.0012, // perc
    spread_margin: 0.0004, //this should technically be called spread
    base: 0,
    cancellation_drift: 0.0002, 
    placement_drift: 0.0007, 
    minimum_price_tick_size: 1, 
    allowMarginVALR: true 
};