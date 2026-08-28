# 🚀 Pulse — Self-Hosting Guide

## What you need
- Node.js 14+ (https://nodejs.org) — just for the file server
- Your Supabase project is already configured ✅

---

## Step 1 — Run the Supabase schema

1. Go to: https://aaappbjtpyltzkbcdigd.supabase.co
2. Click **SQL Editor** in the left sidebar
3. Open `supabase-setup.sql` from this folder
4. Paste the entire contents and click **Run**

This creates all tables, security policies, and the auto-profile trigger.

---

## Step 2 — Start the server

Open a terminal in this folder and run:

```
node server.js
```

You'll see output like:
```
🚀  Pulse is running!

  Local:    http://localhost:3000
  Network:  http://192.168.x.x:3000  ← share this with people on your WiFi
```

---

## Step 3 — Access Pulse

- **On your gaming PC:** http://localhost:3000
- **Other devices on the same network:** use the Network URL above
- **From the internet:** forward port 3000 on your router, then use your public IP

---

## Supabase config (already baked in)

| Setting | Value |
|---------|-------|
| Project URL | https://aaappbjtpyltzkbcdigd.supabase.co |
| Anon Key | ✅ embedded in app.js |

---

## Features with real backend

| Feature | Status |
|---------|--------|
| Sign up / Sign in / Forgot password | ✅ Real Supabase Auth |
| DMs | ✅ Real-time via Supabase Realtime |
| Group chats | ✅ Real-time |
| Message reactions | ✅ Persisted |
| Delete messages | ✅ |
| Reply to messages | ✅ |
| Friend requests | ✅ |
| Online presence | ✅ |
| Communities + channels | ✅ Real-time |
| Create communities | ✅ |
| Add channels | ✅ |
| Stories | ✅ 24h expiry |
| Notifications | ✅ |
| Edit profile + bio | ✅ |

---

## Optional: keep it running 24/7

Install PM2:
```
npm install -g pm2
pm2 start server.js --name pulse
pm2 save
pm2 startup
```
