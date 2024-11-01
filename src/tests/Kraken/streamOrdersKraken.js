const WebSocket = require("ws");

function streamOrderBook() {
  const ws = new WebSocket('wss://ws.kraken.com/v2'); // Kraken WebSocket URL for Level 2 Order Book

  ws.on("open", () => {
    console.log("Connected to Kraken WebSocket");

    // Subscribe to Level 2 Order Book for BTC/USD and MATIC/USD with depth of 10
    const subscribeMessage = JSON.stringify({
      method: "subscribe",
      params: {
        channel: "book", // Subscribe to the book channel for Level 2 order book
        symbol: ["BTC/USD"], // The symbols to subscribe to
        depth: 10, // Number of price levels (10 in this case)
        snapshot: true // Request an initial snapshot of the order book upon subscribing
      },
      req_id: 1 // Optional request ID for tracking responses
    });

    ws.send(subscribeMessage); // Send the subscription request
  });

  ws.on("message", (data) => {
    const parsedData = JSON.parse(data);

    // Check if the message is a snapshot or update for the order book

    if (parsedData.type === "update") {
      const serverTimestamp = new Date(parsedData.data[0].timestamp).getTime(); // Convert to milliseconds
      const currentTime = Date.now()
      latency = currentTime-serverTimestamp
      console.log("Latency",latency);

    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
}

streamOrderBook();
