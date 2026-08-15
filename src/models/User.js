// This schema is owned by your other software (member management / expiry checker).
// This backend only ever READS from it (login, profile) and never writes to it.
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: String,
  mobile: String,
  membership: String,
  join_date: Date,
  membership_started: Date,
  membership_ending: Date,
  membership_status: String,
  payment_status: String,
  plan_name: String,
  plan_fees: String,
  paid_fees: String,
  image: String,
});

module.exports = mongoose.model("members", userSchema);
