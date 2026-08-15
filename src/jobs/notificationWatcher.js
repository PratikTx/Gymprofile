const Notification = require("../models/Notification");
const { sendPushToMember, sendPushToAll } = require("../utils/pushNotification");

const BATCH_SIZE = 50;

/**
 * Your other software inserts rows directly into the `notifications` collection
 * whenever a member does a transaction (payment, new membership, expiry, etc).
 * This backend doesn't own that write — it only watches for new rows and turns
 * them into a push notification:
 *   - type "private" -> push only to that mem_id's registered device(s)
 *   - type "general" -> push to every registered device
 *
 * `pushSent` marks a row as handled so the same notification isn't pushed again
 * on the next poll.
 */
async function processPendingNotifications() {
  const pending = await Notification.find({ pushSent: { $ne: true } })
    .sort({ createdAt: 1 })
    .limit(BATCH_SIZE);

  for (const noti of pending) {
    try {
      const payload = {
        heading: noti.heading,
        details: noti.details,
        notificationId: noti._id,
      };

      if (noti.type === "general") {
        await sendPushToAll(payload);
      } else if (noti.type === "private" && noti.mem_id) {
        await sendPushToMember(noti.mem_id, payload);
      } else {
        console.warn(`[notificationWatcher] skipping notification ${noti._id}: type "${noti.type}" with no mem_id`);
      }

      noti.pushSent = true;
      await noti.save();
    } catch (err) {
      // Leave pushSent unset so it's retried on the next poll instead of being lost.
      console.error(`[notificationWatcher] failed to push notification ${noti._id}:`, err.message);
    }
  }

  if (pending.length > 0) {
    console.log(`[notificationWatcher] processed ${pending.length} notification(s)`);
  }
}

function startNotificationWatcher() {
  const intervalMs = Number(process.env.NOTIFICATION_POLL_INTERVAL_MS) || 10000;

  setInterval(() => {
    processPendingNotifications().catch((err) =>
      console.error("[notificationWatcher] poll cycle failed:", err)
    );
  }, intervalMs);

  console.log(`[notificationWatcher] polling every ${intervalMs}ms for new notifications`);
}

module.exports = { startNotificationWatcher, processPendingNotifications };
