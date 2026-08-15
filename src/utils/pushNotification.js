const { getMessaging } = require("firebase-admin/messaging");
const { isFirebaseInitialized } = require("../config/firebase");
const DeviceToken = require("../models/DeviceToken");

/**
 * Sends a push notification to one or more FCM tokens.
 * Uses a "data" message (not just "notification") so that on Android, your
 * app can handle it in the background/killed state via a background message
 * handler, not just rely on the OS tray notification.
 */
async function sendPushToTokens(tokens, { heading, details, notificationId }) {
  if (!tokens || tokens.length === 0) return;
  if (!isFirebaseInitialized()) {
    console.warn("[push] Firebase not initialized, skipping push send");
    return;
  }

  const message = {
    tokens,
    notification: {
      title: heading,
      body: details,
    },
    data: {
      notificationId: String(notificationId || ""),
      type: "membership_notification",
    },
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: { sound: "default" },
      },
    },
  };

  const response = await getMessaging().sendEachForMulticast(message);

  // Clean up tokens that are no longer valid (app uninstalled, token rotated, etc).
  const deadTokens = [];
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error && res.error.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        deadTokens.push(tokens[idx]);
      }
    }
  });

  if (deadTokens.length > 0) {
    await DeviceToken.deleteMany({ token: { $in: deadTokens } });
  }

  return response;
}

/** Sends a push to every device registered to one member. */
async function sendPushToMember(mem_id, payload) {
  const devices = await DeviceToken.find({ mem_id });
  const tokens = devices.map((d) => d.token);
  return sendPushToTokens(tokens, payload);
}

/** Sends a push to every registered device (for "general" gym-wide notifications). */
async function sendPushToAll(payload) {
  const devices = await DeviceToken.find({});
  const tokens = devices.map((d) => d.token);
  // FCM multicast caps at 500 tokens per call, so batch it.
  const batches = [];
  for (let i = 0; i < tokens.length; i += 500) {
    batches.push(tokens.slice(i, i + 500));
  }
  for (const batch of batches) {
    await sendPushToTokens(batch, payload);
  }
}

module.exports = { sendPushToMember, sendPushToAll };
