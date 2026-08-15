const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// One member can have multiple devices (phone + tablet, reinstalled app, etc).
const deviceTokenSchema = new Schema({
  mem_id: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, enum: ["ios", "android"], required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("device_tokens", deviceTokenSchema);
