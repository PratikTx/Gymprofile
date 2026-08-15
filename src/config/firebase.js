const { initializeApp, cert, getApps } = require("firebase-admin/app");

let initialized = false;

/**
 * Initializes Firebase Admin using a service account JSON.
 * Get this file from: Firebase Console -> Project Settings -> Service Accounts -> Generate new private key.
 * Save it as `firebase-service-account.json` in the project root (and keep it out of git),
 * or point FIREBASE_SERVICE_ACCOUNT_PATH at wherever you store it.
 *
 * NOTE: firebase-admin v14 uses a modular API — there is no more
 * `admin.credential.cert(...)` / `admin.messaging()`. `cert` and `initializeApp`
 * come from "firebase-admin/app", and messaging comes from "firebase-admin/messaging"
 * (see src/utils/pushNotification.js).
 */
function initFirebase() {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";

  try {
    const serviceAccount = require(require("path").resolve(path));
    initializeApp({
      credential: cert(serviceAccount),
    });
    initialized = true;
    console.log("[firebase] Admin SDK initialized");
  } catch (err) {
    console.warn(
      "[firebase] Could not initialize Firebase Admin SDK — push notifications will be skipped.",
      "Add your service account file and set FIREBASE_SERVICE_ACCOUNT_PATH in .env.",
      err.message
    );
  }
}

function isFirebaseInitialized() {
  return initialized;
}

module.exports = { initFirebase, isFirebaseInitialized };
