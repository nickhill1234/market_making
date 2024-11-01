const WebSocket = require("ws");

function streamPrices() {
  const ws = new WebSocket('wss://ws.kraken.com/v2'); // Kraken Level 1 WebSocket URL

  ws.on("open", () => {
    console.log("Connected to Kraken WebSocket");

    // Subscribe to Level 1 Ticker (Best Bid/Offer) for BTC/USD and MATIC/GBP
    const subscribeMessage = JSON.stringify({
      method: "subscribe",
      params: {
        channel: "ticker", // Ticker channel for Level 1 market data
        symbol: ["BTC/USD"], // The symbols to subscribe to
        event_trigger: "bbo", // Trigger updates on best-bid-offer changes
        snapshot: false, // Request a snapshot of the current state after subscribing
      },
      req_id: 1 // Optional request ID for tracking responses
    });

    ws.send(subscribeMessage); // Send the subscription request

    // Start sending application-level pings every 30 seconds
    setInterval(() => {
      const pingMessage = JSON.stringify({
        method: "ping",
        req_id: Date.now() // Use a timestamp as a unique request ID
      });
      ws.send(pingMessage);
      console.log('Ping sent');
    }, 4000); // Ping every 30 seconds
  });

  ws.on("message", (data) => {
    const parsedData = JSON.parse(data);
    console.log('kraken data',parsedData)
    // Handle 'pong' response to the ping
    if (parsedData.method === "pong") {
      console.log("Pong received, connection alive");
    }

    // Check if the message is a snapshot or update for ticker data
    if (parsedData.type === "update") {
      const tickerData = parsedData.data[0]; // The ticker data is always the first element in the data array

      // Log the relevant ticker data
      console.log(`Symbol: ${tickerData.symbol}`);
      console.log(`Best Bid: ${tickerData.bid}, Best Ask: ${tickerData.ask}`);
      console.log('------------------------------------');
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
}

streamPrices();
