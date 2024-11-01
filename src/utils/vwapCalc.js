function calculateVWAP(orderArray, config) {
    let totalValue = 0;
    let totalQty = 0;
    let orderIndex = 0;

    while (totalQty < config.min_order) {
        let remainingSize = config.min_order - totalQty; // Calculate remaining size needed
        let price = parseFloat(orderArray[orderIndex][0]);
        let qty = parseFloat(orderArray[orderIndex][1]);
        if (qty < remainingSize) {
            totalValue += (price * qty);
            totalQty += qty;
        } else {
            totalValue += (price * remainingSize);
            totalQty += remainingSize;
            break; // Exit the loop once we have enough quantity
        }
        
        orderIndex += 1;

        // If we've exhausted the order book
        if (orderIndex >= orderArray.length) {
            break; // Prevent accessing out of bounds
        }
    }

    return totalQty > 0 ? totalValue / totalQty : 0; // return 0 if no valid orders
}
module.exports = calculateVWAP 