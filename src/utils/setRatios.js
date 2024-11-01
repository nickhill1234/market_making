function setRatios(config, positionSize) {
    let bidMultiplier, askMultiplier;
    if(positionSize > 0) {
        //we are short premium therefore we need to add an exit spread on the ask
        bidMultiplier = 1 + (config.base + (((positionSize - config.min_order)/config.max_position) * config.range) - config.spread_margin);
        askMultiplier = 1 + (config.base + ((positionSize/config.max_position) * config.range) + config.spread_margin);
    } else if(positionSize < 0) {
        //we are long premium therefore we need to add an exit spread on the bid
        bidMultiplier = 1 + (config.base + ((positionSize/config.max_position) * config.range) - config.spread_margin);
        askMultiplier = 1 + (config.base + (((positionSize + config.min_order)/config.max_position) * config.range) + config.spread_margin);
    } else {
        bidMultiplier = 1 + (config.base + ((positionSize/config.max_position) * config.range) - config.spread_margin);
        askMultiplier = 1 + (config.base + ((positionSize/config.max_position) * config.range) + config.spread_margin);
    }

    return {
        bidMultiplier,
        askMultiplier
    };
}

module.exports = setRatios;