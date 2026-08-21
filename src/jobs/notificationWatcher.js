const Notification = require("../models/Notification");
const DeviceToken = require("../models/DeviceToken");
const { sendPushToMember, sendPushToAll } = require("../utils/pushNotification");

const BATCH_SIZE = 50;

// How long a device token can sit without checking in before we consider it stale
// (e.g. app was uninstalled and we never happened to send it a push to catch the error).
const STALE_TOKEN_DAYS = Number(process.env.STALE_TOKEN_DAYS) || 90;

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

/**
 * Deletes notifications whose deleteOn date has already passed.
 * These are rows your other software (or this backend) marked with an
 * expiry date; once that date is behind us, there's no reason to keep them.
 */
async function cleanupExpiredNotifications() {
  const result = await Notification.deleteMany({
    deleteOn: { $ne: null, $lte: new Date() },
  });

  if (result.deletedCount > 0) {
    console.log(`[notificationWatcher] deleted ${result.deletedCount} expired notification(s)`);
  }
}

/**
 * Deletes device tokens that haven't checked in (updatedAt) for a long time.
 * This is a backup net for members who deleted the app but never happened to
 * get sent a push notification, so pushNotification.js's error-based cleanup
 * never got a chance to catch their dead token.
 */
async function cleanupStaleDeviceTokens() {
  const cutoff = new Date(Date.now() - STALE_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  const result = await DeviceToken.deleteMany({ updatedAt: { $lte: cutoff } });

  if (result.deletedCount > 0) {
    console.log(`[notificationWatcher] deleted ${result.deletedCount} stale device token(s)`);
  }
}

function startNotificationWatcher() {
  const intervalMs = Number(process.env.NOTIFICATION_POLL_INTERVAL_MS) || 10000;
  // Cleanup doesn't need to run every 10s - once a day is plenty.
  const cleanupIntervalMs = Number(process.env.CLEANUP_INTERVAL_MS) || 24 * 60 * 60 * 1000;

  setInterval(() => {
    processPendingNotifications().catch((err) =>
      console.error("[notificationWatcher] poll cycle failed:", err)
    );
  }, intervalMs);

  setInterval(() => {
    cleanupExpiredNotifications().catch((err) =>
      console.error("[notificationWatcher] expired notification cleanup failed:", err)
    );
    cleanupStaleDeviceTokens().catch((err) =>
      console.error("[notificationWatcher] stale device token cleanup failed:", err)
    );
  }, cleanupIntervalMs);

  // Also run once on startup so cleanup isn't stuck waiting 24h after a fresh deploy.
  cleanupExpiredNotifications().catch((err) =>
    console.error("[notificationWatcher] expired notification cleanup failed:", err)
  );
  cleanupStaleDeviceTokens().catch((err) =>
    console.error("[notificationWatcher] stale device token cleanup failed:", err)
  );

  console.log(`[notificationWatcher] polling every ${intervalMs}ms for new notifications`);
  console.log(`[notificationWatcher] running cleanup every ${cleanupIntervalMs}ms (stale token cutoff: ${STALE_TOKEN_DAYS} days)`);
}

module.exports = {
  startNotificationWatcher,
  processPendingNotifications,
  cleanupExpiredNotifications,
  cleanupStaleDeviceTokens,
};
