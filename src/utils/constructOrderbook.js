function adjustOrderbook(orderBook, { type, updates }) {
    console.log(`[${new Date().toISOString()}] `,type,updates)
    updates.forEach(priceLevel => {
        const { Price, Orders } = priceLevel;
        Orders.forEach(order => {
            const { orderId, quantity } = order;
            console.log(`[${new Date().toISOString()}] processing new`,type,Price,Orders)

            // Check for zero quantity (cancellation)
            if (parseFloat(quantity) === 0) { // Ensure quantity is compared as a number
                const priceLevelToUpdate = (type === 'ask' ? orderBook.Asks : orderBook.Bids).find(pl => pl.Price === Price);
                if (priceLevelToUpdate) {
                    priceLevelToUpdate.Orders = priceLevelToUpdate.Orders.filter(o => o.orderId !== orderId);
                    console.log('removing order',priceLevelToUpdate.Orders)
                    // If no orders remain, remove the price level
                    if (priceLevelToUpdate.Orders.length === 0) {
                        if (type === 'ask') {
                            orderBook.Asks = orderBook.Asks.filter(pl => pl.Price !== Price);
                        } else {
                            orderBook.Bids = orderBook.Bids.filter(pl => pl.Price !== Price);
                        }
                    }

                }
            } else {
                // For non-zero quantity, either update or add the order
                const existingPriceLevel = (type === 'ask' ? orderBook.Asks : orderBook.Bids).find(pl => pl.Price === Price);
                if (existingPriceLevel) {
                    // Check if the order already exists
                    const existingOrder = existingPriceLevel.Orders.find(o => o.orderId === orderId);
                    if (existingOrder) {
                        existingOrder.Quantity = quantity; // Update the quantity
                        console.log('adding new quantity',existingOrder)

    
                    } else {
                        existingPriceLevel.Orders.push({ orderId, Price, Quantity: quantity }); // Add new order
                        const priceLevelToUpdate = orderBook.Asks.find(pl => pl.Price === Price);
                        console.log('checking added order',priceLevelToUpdate.Orders)
                    }
                } else {
                    // Create a new price level if it doesn't exist
                    if (type === 'ask') {
                        orderBook.Asks.push({ Price, Orders: [{ orderId, Quantity: quantity }] });
                        const newPriceLevel = orderBook.Asks.find(pl => pl.Price === Price);
                        console.log('adding new price level',newPriceLevel)

                    } else {
                        orderBook.Bids.push({ Price, Orders: [{ orderId, Quantity: quantity }] });
                        const newPriceLevel = orderBook.Bids.find(pl => pl.Price === Price);
                        console.log('adding new price level',newPriceLevel)

                    }
                }
            }
        });
    });
}

module.exports = adjustOrderbook;
