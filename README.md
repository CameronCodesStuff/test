# Pulse

A single-page chat/social app concept — Discord-style hubs, DMs, friends,
stories, and a camera tab!

## Features

### Auth
- Login, sign up, and forgot-password views in one animated card
- "Continue as Demo User" shortcut — no real backend, any submit logs you in
- Animated background: soft radial "pulse" rings expanding from a glowing
  core, ambient color orbs
- The auth card itself has a **clean white pulse animation**: a thin light
  sweep rotates around the border ring, paired with a soft breathing glow
  and a barely-there scale "breathe" — all pure white, no color mixed in

### Chats (DMs)
- Conversation list with avatars, online status, unread badges, last-message
  preview
- Full message thread: grouped messages, reactions, reply-to, read receipts,
  typing indicator, image bubbles
- Emoji/image/GIF actions in the composer

### Friends
- Friend list with online/offline sections
- Incoming friend request banner
- "Message" shortcut that spins up a DM

### Hubs (Communities)
- Server-style communities, each with multiple text channels
- **Community rail**: once you open a community, the full community list
  collapses into a slim icon rail (avatars only) so the channel list and
  chat get the space back. Click the arrow to expand it again, or the
  "Collapse to icons" button in the full list.
- Channel sidebar (community name, member/online count, channel list)
- Members sidebar split into Online / Offline
- Discover panel with a "Browse Communities" call to action
- Responsive: the members sidebar tucks away first on narrower windows,
  then the channel rail trims down, before falling back to the mobile layout

### Stories
- Story ring grid (seen/unseen states)
- Full-screen story viewer with progress bars, auto-advance timer, and a
  reply bar

### Camera
- Full-screen camera mock UI with flash/flip actions and a capture button

### Profile
- Basic profile view

## Stack

- **React 18** (UMD build) + **Babel Standalone** for in-browser JSX — no
  build step, no `node_modules`
- Plain CSS with custom properties for theming (`styles.css`)
- Google Fonts: **Space Grotesk** (display) + **Inter** (body)
- Everything lives in three files: `index.html`, `app.js`, `styles.css`
