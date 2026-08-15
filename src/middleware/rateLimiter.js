const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redisClient } = require("../config/redis");

function makeStore(prefix) {
  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix,
  });
}

// General API traffic: generous, just to blunt scraping/abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:api:"),
  message: { message: "Too many requests, please try again later." },
});

// Login: tight limit to slow down brute-forcing the shared gym password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore("rl:login:"),
  message: { message: "Too many login attempts. Please try again in a few minutes." },
});

module.exports = { apiLimiter, loginLimiter };
