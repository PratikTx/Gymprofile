# D Fitness Zone — Backend v2

Restructured backend with Redis-backed rate limiting and push notifications
(via Firebase Cloud Messaging) so members get notified even when the app is closed.

## Architecture

Your setup has **two pieces of software**:

1. **Your other software** — adds/manages members, checks membership expiry, and
   writes rows directly into MongoDB's `notifications` collection whenever a member
   does a transaction (payment, new membership, expiry, etc). This backend does not
   touch that logic, and **never writes to the `members` collection (`User.js`)** —
   that model is read-only here, used only for login and profile lookups.

2. **This backend** — watches the `notifications` collection for new/unsent rows and
   turns them into a push notification:
   - `type: "private"` → pushed only to that specific `mem_id`'s registered device(s).
   - `type: "general"` → pushed to every registered device.

   It never needs to know *why* a notification was created — it just watches, pushes,
   and marks the row so it isn't pushed twice.

## What changed from your original backend

**Security fixes:**
- MongoDB URI, JWT secret, and the shared login password were hardcoded in source
  files. They now live in `.env` (git-ignored). **You should still rotate your MongoDB
  Atlas password and generate a new JWT secret**, since the old ones were exposed in
  the code you shared.
- `verifyToken` middleware had a bug: on a missing token it sent a 400 response but
  didn't `return`, so it fell through to `jwt.verify(undefined, ...)` and would have
  crashed the request. Fixed, and `jwt.verify` is now wrapped in try/catch too (an
  expired/invalid token would otherwise crash the process).

**New: Redis + rate limiting**
- `src/config/redis.js` — single shared Redis client.
- `src/middleware/rateLimiter.js` — `express-rate-limit` backed by Redis (via
  `rate-limit-redis`), so limits are enforced consistently even across multiple
  server instances.
  - Global: 300 requests / 15 min per IP on all `/api` routes.
  - Login: 10 attempts / 15 min per IP.

**New: Push notifications (Firebase Cloud Messaging)**
- `src/models/DeviceToken.js` — stores each member's FCM device token.
- `POST /api/member/device` — your React Native app calls this after login (and
  whenever the FCM token refreshes) to register the device.
- `src/utils/pushNotification.js` — sends pushes via FCM, cleans up dead/expired
  tokens automatically.
- `src/jobs/notificationWatcher.js` — polls the `notifications` collection every
  `NOTIFICATION_POLL_INTERVAL_MS` (default 10s) for rows where `pushSent` isn't
  `true` yet. For each one:
  - `type: "private"` → push to that `mem_id`'s device(s).
  - `type: "general"` → push to everyone.
  - Marks the row `pushSent: true` once delivered. If the push fails, the row is
    **left unmarked** so it's retried automatically on the next poll instead of
    being silently lost.

  This field is intentionally separate from `read` (which your frontend already
  sets when the member opens a notification in-app) — otherwise an unread
  notification would get re-pushed on every single poll cycle.

- `POST /api/admin/broadcast` — optional convenience endpoint if you ever want to
  fire a one-off announcement from this backend instead of writing to Mongo
  yourself. It just inserts a row with `type: "general"`; the watcher picks it up
  and pushes it like any other notification. You don't need this for your normal
  flow since your other software already writes rows directly.

## Setup

```bash
npm install
cp .env.example .env
# fill in .env: MONGO_URI, JWT_SECRET, ADMIN_API_KEY, REDIS_URL, etc.
```

### Redis
Local dev:
```bash
docker run -p 6379:6379 redis:7
```
Production: use a managed Redis (Upstash, Redis Cloud, AWS ElastiCache, etc.) and
put its connection URL in `REDIS_URL`.

### Firebase (for push notifications)
1. In the [Firebase console](https://console.firebase.google.com/), create a project
   (or use an existing one).
2. Project Settings → Service Accounts → **Generate new private key** — downloads a JSON file.
3. Save it in this project's root as `firebase-service-account.json` (already git-ignored).
4. In your React Native app, install `@react-native-firebase/app` and
   `@react-native-firebase/messaging`, connect it to the **same** Firebase project
   (download `google-services.json` for Android / `GoogleService-Info.plist` for iOS
   from that project), and:
   - Request notification permission on first launch.
   - Get the FCM token (`messaging().getToken()`) and `POST` it to
     `/api/member/device` with `{ token, platform: "android" | "ios" }` right after login.
   - Register `messaging().onTokenRefresh(...)` to re-register whenever the token changes.
   - Add a background message handler (`messaging().setBackgroundMessageHandler(...)`)
     in your `index.js` — this is what lets notifications arrive while the app is
     fully closed.

Run `npm start`. If the service account file isn't found yet, the server still
starts — it just logs a warning and skips push sends, so you can build/test the
rest first.

## Notification document shape

This is what the watcher expects your other software to write into the
`notifications` collection (matches your original schema):

```js
{
  mem_id: "…",        // required when type is "private", omit/ignore for "general"
  heading: "…",
  from: "…",
  details: "…",
  createdAt: new Date(),
  deleteOn: new Date(),
  type: "private" | "general",
  // pushSent and read are managed by this backend — no need to set them yourself.
}
```

## API summary

| Method | Path                              | Auth        | Purpose |
|--------|------------------------------------|-------------|---------|
| POST   | /api/auth/login                    | rate-limited| Member login |
| GET    | /api/member                        | member JWT  | Get own profile |
| POST   | /api/member/device                 | member JWT  | Register FCM token |
| DELETE | /api/member/device                 | member JWT  | Unregister FCM token (e.g. on logout) |
| GET    | /api/member/notifications          | member JWT  | List own + general notifications |
| PATCH  | /api/member/notifications/:id/read | member JWT  | Mark a notification read |
| POST   | /api/admin/broadcast               | admin key   | (Optional) manually queue a notification |

## Next steps

Once you send over your Vite frontend, the plan for the React Native conversion is:
1. Swap out Vite-only APIs (e.g. `import.meta.env`) for React Native equivalents
   (`react-native-config` or `.env` via `react-native-dotenv`).
2. Swap browser-only navigation/routing for `react-navigation`.
3. Replace any `localStorage` usage with `@react-native-async-storage/async-storage`
   (auth token storage).
4. Wire up `@react-native-firebase/messaging` as described above so it talks to the
   endpoints already built here.

Send the frontend project whenever you're ready and we'll go through it.
