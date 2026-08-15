const express = require("express");
const router = express.Router();
const { verifyAdmin } = require("../middleware/auth");
const { broadcast } = require("../controllers/admin.controller");

router.post("/broadcast", verifyAdmin, broadcast);

module.exports = router;
