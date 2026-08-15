const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// This matches the fields your other software already writes when it inserts
// a notification (mem_id, heading, from, details, createdAt, deleteOn, type).
// `read` and `pushSent` are extra fields owned by this backend:
//   - read: set by the member when they open/view it in the app (existing behavior).
//   - pushSent: set internally once we've fired the FCM push for it, so the watcher
//     doesn't push the same notification again on every poll cycle. This is
//     intentionally separate from `read`, since a member not having opened the
//     notification yet shouldn't cause it to be re-pushed repeatedly.
const notificationSchema = new Schema({
  mem_id: String, // present when type === "private"
  heading: String,
  from: String,
  details: String,
  createdAt: { type: Date, default: Date.now },
  deleteOn: Date,
  type: { type: String, enum: ["private", "general"], default: "private" },
  read: { type: Boolean, default: false },
  pushSent: { type: Boolean, default: false },
});

module.exports = mongoose.model("notifications", notificationSchema);
