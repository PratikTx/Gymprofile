const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function login(req, res) {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ message: "mobile and password are required" });
  }

  const data = await User.findOne({ mobile });

  // Matches your original login flow: one shared gym password for all members
  // (previously hardcoded as "mygym" in index.js, now read from .env instead).
  // User.js itself is untouched, since it's managed by your other software.
  if (data && password === process.env.DEFAULT_LOGIN_PASSWORD) {
    const token = jwt.sign({ userId: data._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ token });
  }

  return res.status(400).json({ message: "user not found" });
}

module.exports = { login };
