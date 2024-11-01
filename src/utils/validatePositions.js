// utils/positionUtils.js

function validationPositions(positions) {

    const firstDirection = positions[0].position.direction;
    const firstEpic = positions[0].market.epic;
    const allSameDirection = positions.every(pos => pos.position.direction === firstDirection);
    const allSameMarket = positions.every(pos => pos.market.epic === firstEpic);

    if (!allSameDirection || !allSameMarket) {
        console.error('Error: Not all positions are in the same direction or market. Shutting down the bot.');
        process.exit(1); // Exit the process with an error
    }

    return firstDirection;
}

function calculateTotalPositionSize(positions, config) {
    const scaling = positions[0]?.market.scalingFactor / config.position_scaling_factor; 
    const totalPositionSize = positions.reduce((total, pos) => total + pos.position.dealSize, 0);
    return totalPositionSize * scaling;
}

function getLatestOrderId(positions) {

    let latestPosition = positions[0];
    let latestDate = new Date(positions[0].position.createdDate);

    for (let i = 1; i < positions.length; i++) {
        let currentDate = new Date(positions[i].position.createdDate);
        if (currentDate > latestDate) {
            latestPosition = positions[i];
            latestDate = currentDate;
        }
    }
    dealId = latestPosition.position.dealId
    price = latestPosition.position.openLevel
    return { dealId, price };
}

module.exports = {
    validationPositions,
    calculateTotalPositionSize,
    getLatestOrderId
};
