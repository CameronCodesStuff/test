# Firebase Setup for Pulse

## 1. Firestore Collections

Create these collections in your Firebase console (they'll auto-create on first write, but you need the rules):

### Firestore Security Rules
Paste these into **Firestore → Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles: anyone authenticated can read, only the owner can write
    match /profiles/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    // Conversations: members only
    match /conversations/{convId} {
      allow read, write: if request.auth != null && request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      match /messages/{msgId} {
        allow read, write: if request.auth != null;
      }
    }
    // Friendships
    match /friendships/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.requester_id == request.auth.uid;
      allow update: if request.auth != null && resource.data.addressee_id == request.auth.uid;
    }
    // Communities
    match /communities/{commId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      match /channels/{chanId} {
        allow read, write: if request.auth != null;
        match /messages/{msgId} {
          allow read, write: if request.auth != null;
        }
      }
    }
    match /community_members/{id} {
      allow read, write: if request.auth != null;
    }
    match /stories/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /story_views/{id} {
      allow read, write: if request.auth != null;
    }
    match /notifications/{id} {
      allow read, write: if request.auth.uid == resource.data.user_id;
    }
  }
}
```

## 2. Firestore Indexes

In **Firestore → Indexes**, create these composite indexes:

> **Note:** Use the **collection group name only** (e.g. `messages`) — never a full path with slashes (e.g. ~~`conversations/{id}/messages`~~). Firestore rejects paths containing `/` when creating indexes.

| Collection Group | Fields | Query Scope |
|---|---|---|
| `conversations` | `members` (Array), `last_message_at` (Desc) | Collection |
| `friendships` | `requester_id` (Asc), `status` (Asc) | Collection |
| `friendships` | `addressee_id` (Asc), `status` (Asc) | Collection |
| `notifications` | `user_id` (Asc), `read` (Asc) | Collection |
| `notifications` | `user_id` (Asc), `created_at` (Desc) | Collection |

Single-field indexes (`created_at` on `messages`, `channels`) and range queries on a single field (`expires_at > x order by expires_at` on `stories`) are handled automatically by Firestore and do **not** need a manual composite index entry.

## 3. Firebase Authentication

Enable **Email/Password** sign-in in **Authentication → Sign-in method**.

## 4. databaseURL

Make sure your Firebase project has **Realtime Database** enabled (even if unused for now),
and update `databaseURL` in `index.html` to match your project:
```
https://<your-project-id>-default-rtdb.firebaseio.com
```

## Data Structure (Firestore)

```
/profiles/{uid}
  id, display_name, username, initials, color, bio, online, last_seen, created_at

/conversations/{id}
  type ("dm"|"group"), name, members: [uid, uid, ...], created_by, last_message_at
  /messages/{id}
    sender_id, sender: {id, display_name, initials, color}, text,
    reply_to_id, reactions: [{emoji, count}], created_at

/friendships/{id}
  requester_id, addressee_id, status ("pending"|"accepted"|"declined"), created_at

/communities/{id}
  name, description, created_by, member_count, created_at
  /channels/{id}
    name, community_id, created_at
    /messages/{id}
      sender_id, sender: {...}, text, created_at

/community_members/{communityId_userId}
  community_id, user_id, role, joined_at

/stories/{id}
  user_id, caption, color, expires_at, created_at

/story_views/{storyId_userId}
  story_id, viewer_id, viewed_at

/notifications/{id}
  user_id, title, description, icon, color, read, created_at
```
