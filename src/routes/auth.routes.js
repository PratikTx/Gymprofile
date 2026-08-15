const express = require("express");
const router = express.Router();
const { login } = require("../controllers/auth.controller");
const { loginLimiter } = require("../middleware/rateLimiter");

router.post("/login", loginLimiter, login);

module.exports = router;
