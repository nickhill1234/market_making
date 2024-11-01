const CRC = require("crc");

const calculateCRC32 = (orderBook) => {
    const selectBestOrders = (side) => {
        const list = [];
        for (const priceLevel of side) {
            for (const order of priceLevel.Orders) {
                if (list.length === 25) return list; // Limit to 25 best orders
                list.push(`${order.orderId}:${order.quantity}`);
            }
        }
        return list;
    };

    const bids = selectBestOrders(orderBook.Bids);
    const asks = selectBestOrders(orderBook.Asks);
    console.log(`[${new Date().toISOString()}] checksum bid`,bids)

    const orders = [];
    
    // Interleave bids and asks
    for (let i = 0; i < 25; i++) {
        if (bids[i]) orders.push(bids[i]);
        if (asks[i]) orders.push(asks[i]);
    }

    // Concatenate the orders and calculate the CRC32 checksum
    return CRC.crc32(orders.join(":")); // Calculate checksum using the concatenated string
};

module.exports = calculateCRC32;
