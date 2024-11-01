module.exports = {
    primary_market: 'BTCZAR',
    secondary_market: 'BTCZARPERP',
    base_ccy: 'BTC',
    max_position: 0.163, 
    min_order: 0.0012, 
    min_hedge_size: 0.0001, 
    range: 0.0015, 
    spread_margin: 0.0003, 
    base: 0,
    cancellation_drift: 0.0002, 
    placement_drift: 0.0007, // need to decide if we need this?
    minimum_price_tick_size: 1, 
    allowMarginVALR: true 
};
