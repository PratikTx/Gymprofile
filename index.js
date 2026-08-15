require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyparser = require("body-parser");
const cookieparser = require("cookie-parser");

const connectDB = require("./src/config/db");
const { connectRedis } = require("./src/config/redis");
const { initFirebase } = require("./src/config/firebase");

async function start() {
  await connectDB();
  await connectRedis();
  initFirebase();

  // Required only after Redis is connected: express-rate-limit's Redis store
  // initializes as soon as its module is loaded, so requiring these too early
  // (before the client is open) throws "The client is closed".
  const { apiLimiter } = require("./src/middleware/rateLimiter");
  const { startNotificationWatcher } = require("./src/jobs/notificationWatcher");
  const authRoutes = require("./src/routes/auth.routes");
  const memberRoutes = require("./src/routes/member.routes");
  const adminRoutes = require("./src/routes/admin.routes");

  const app = express();

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());

  app.use(
    cors({
      // React Native / mobile clients don't send a browser Origin header, so
      // allow requests with no origin through; only enforce the allowlist for
      // browser-based origins (your Vite web app, admin dashboard, etc).
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    })
  );
  app.use(bodyparser.urlencoded({ extended: true }));
  app.use(cookieparser());
  app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
  // Global rate limiting on every API route; login has its own tighter limit.
  app.use("/api", apiLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/member", memberRoutes);
  app.use("/api/admin", adminRoutes);

  app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

  // Fallback error handler so an unexpected error doesn't crash the process
  // or leak a stack trace to the client.
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Something went wrong" });
  });

  startNotificationWatcher();

  const port = process.env.PORT || 1000;
  app.listen(port, () => console.log(`[server] listening on port ${port}`));
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
