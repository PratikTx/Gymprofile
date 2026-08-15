const User = require("../models/User");
const DeviceToken = require("../models/DeviceToken");

async function getProfile(req, res) {
  const data = await User.findById(req.user.userId);
  if (!data) {
    return res.status(404).json({ message: "member not found" });
  }
  res.status(200).json({ user: data });
}

/**
 * React Native app calls this once it has an FCM token (on login, and again
 * whenever Firebase rotates the token via onTokenRefresh). This is what lets
 * us push to the member's phone even when the app is closed.
 */
async function registerDevice(req, res) {
  const { token, platform } = req.body;
  if (!token || !platform) {
    return res.status(400).json({ message: "token and platform are required" });
  }
  if (!["ios", "android"].includes(platform)) {
    return res.status(400).json({ message: "platform must be 'ios' or 'android'" });
  }

  await DeviceToken.findOneAndUpdate(
    { token },
    { mem_id: req.user.userId, token, platform, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({ message: "device registered" });
}

async function unregisterDevice(req, res) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "token is required" });
  }
  await DeviceToken.deleteOne({ token, mem_id: req.user.userId });
  res.status(200).json({ message: "device unregistered" });
}

module.exports = { getProfile, registerDevice, unregisterDevice };
