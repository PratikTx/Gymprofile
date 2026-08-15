const Notification = require("../models/Notification");

/**
 * Optional convenience/testing endpoint. Your other software is expected to insert
 * notification rows directly into MongoDB for real transactions (payments,
 * membership changes, expiry, etc) — this backend's watcher will pick those up
 * and push them automatically without you needing to call this.
 *
 * This route exists only for cases where you want to fire a one-off announcement
 * (e.g. "Gym closed tomorrow") from this backend instead of writing to Mongo yourself.
 * It just inserts the row — the notificationWatcher job does the actual push.
 */
async function broadcast(req, res) {
  const { heading, details, from, type, mem_id } = req.body;
  if (!heading || !details) {
    return res.status(400).json({ message: "heading and details are required" });
  }
  if (type === "private" && !mem_id) {
    return res.status(400).json({ message: "mem_id is required for type 'private'" });
  }

  const deleteOn = new Date();
  deleteOn.setDate(deleteOn.getDate() + 30);

  const noti = await Notification({
    mem_id: type === "private" ? mem_id : undefined,
    from: from || "D Fitness Zone",
    heading,
    details,
    createdAt: new Date(),
    deleteOn,
    type: type === "private" ? "private" : "general",
  }).save();

  res.status(201).json({ message: "notification queued", notification: noti });
}

module.exports = { broadcast };
