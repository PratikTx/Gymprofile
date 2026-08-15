const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { getProfile, registerDevice, unregisterDevice } = require("../controllers/member.controller");
const { listNotifications, markRead } = require("../controllers/notification.controller");

router.get("/", verifyToken, getProfile);
router.post("/device", verifyToken, registerDevice);
router.delete("/device", verifyToken, unregisterDevice);
router.get("/notifications", verifyToken, listNotifications);
router.patch("/notifications/:id/read", verifyToken, markRead);

module.exports = router;
