const Notification = require("../models/Notification");

async function listNotifications(req, res) {
  const noti = await Notification.find({
    $or: [{ $and: [{ mem_id: req.user.userId }, { type: "private" }] }, { type: "general" }],
  }).sort({ createdAt: -1 });

  res.status(200).json({ notifications: noti });
}

async function markRead(req, res) {
  const { id } = req.params;
  const noti = await Notification.findOneAndUpdate(
    { _id: id, $or: [{ mem_id: req.user.userId }, { type: "general" }] },
    { read: true },
    { new: true }
  );
  if (!noti) {
    return res.status(404).json({ message: "notification not found" });
  }
  res.status(200).json({ notification: noti });
}

module.exports = { listNotifications, markRead };
