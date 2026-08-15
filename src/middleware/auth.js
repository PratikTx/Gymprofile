const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  token = token.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Malformed authorization header" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Simple shared-secret guard for server-to-server / admin endpoints
// (e.g. payment confirmed webhook, membership renewal from your admin panel).
function verifyAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

module.exports = { verifyToken, verifyAdmin };
