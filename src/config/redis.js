const { createClient } = require("redis");

// Single shared Redis connection for the whole app (rate limiter, caching, etc).
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("[redis] client error:", err.message);
});

redisClient.on("connect", () => {
  console.log("[redis] connected");
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}

module.exports = { redisClient, connectRedis };
