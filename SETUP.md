# Ningi — Complete Setup Guide

> Two people on different laptops in different cities can chat live on the same URL.
> No server to maintain — Supabase is your backend.

---

## What You're Building

- **Chrome Extension** (side panel) — React + Vite + Supabase JS
- **Backend** — 100% Supabase (hosted Postgres + Realtime WebSockets + Auth)
- No custom server, no Docker, no deployment headaches

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 or higher | https://nodejs.org |
| npm | comes with Node | — |
| Chrome | any recent | — |
| Supabase account | free tier is fine | https://supabase.com |

---

## Part 1 — Supabase Setup (5 minutes)

### 1.1 Create a project

1. Go to https://supabase.com and sign in
2. Click **New project**
3. Choose a name (e.g. `ningi`), set a database password, pick a region close to you
4. Wait ~2 minutes for it to provision

### 1.2 Disable email confirmation (REQUIRED)

By default Supabase requires users to click a verification email. We're skipping that.

1. In your project dashboard → **Authentication** → **Providers** → **Email**
2. Toggle **Confirm email** → **OFF**
3. Click **Save**

### 1.3 Run the database schema

1. In your project dashboard → **SQL Editor** → **New query**
2. Open the file `supabase-schema.sql` from this project
3. Paste the entire contents and click **Run** (▶)
4. You should see "Success. No rows returned" — that's correct

### 1.4 Enable Realtime on the two tables

If the last two lines of the SQL gave an error (permissions), do it manually:

1. Go to **Database** → **Replication** (left sidebar)
2. Under **supabase_realtime**, find `messages` → enable it
3. Find `direct_messages` → enable it

### 1.5 Get your credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — the long JWT string under "Project API keys"

Keep these handy for the next step.

---

## Part 2 — Extension Setup (5 minutes)

### 2.1 Get the code

```bash
# If you received a ZIP, unzip it and open that folder
cd ningi

# Install dependencies
npm install
```

### 2.2 Configure Supabase credentials

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
```

> ⚠️ The `.env` file must NOT be committed to git if you share this repo publicly.
> The anon key is safe to expose (Supabase RLS protects your data), but still keep it private as good practice.

### 2.3 Add icons (required by Chrome)

Chrome requires extension icons. Add three PNG files in the `public/icons/` folder:

```
public/icons/icon16.png    (16×16)
public/icons/icon48.png    (48×48)
public/icons/icon128.png   (128×128)
```

**Quick option** — download any icon and resize it:
- Use https://favicon.io/favicon-generator or any tool
- Or use any 3 PNG files you have and rename them

The extension won't load without these files.

### 2.4 Build the extension

```bash
npm run build
```

This creates a `dist/` folder.

---

## Part 3 — Load into Chrome (2 minutes)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder inside your project
5. Ningi should appear in your extensions list with a pin icon

**To open it:**
- Click the puzzle-piece icon in Chrome toolbar
- Click Ningi — the side panel opens on the right

---

## Part 4 — Test with Your Friend

### Both of you do:

1. Complete Parts 1–3 (same `.env` — same Supabase project)
2. Load the extension in Chrome
3. Open the same URL (e.g. `https://news.ycombinator.com`)
4. Sign up / sign in (use different accounts)
5. Select the same URL in the dropdown
6. Chat! Messages appear in real-time on both screens 🎉

> **Key:** You both must connect to the **same Supabase project** (same URL + anon key in `.env`).
> The room is identified by the URL — same URL = same room.

---

## Development Mode (hot reload)

```bash
npm run dev
```

Then in `chrome://extensions`, click the **refresh** icon on Ningi after each code change.
(Hot reload works for most changes; manifest/background changes need a full reload.)

---

## Rebuild after code changes

```bash
npm run build
# Then in chrome://extensions → click refresh on Ningi
```

---

## Create a distributable ZIP

```bash
npm run build
npm run zip
# Creates ningi.zip — share this with your friend instead of the whole repo
```

Your friend just needs to:
1. Unzip it
2. Go to `chrome://extensions` → Load unpacked → select the unzipped folder

---

## How It Works (architecture overview)

```
Chrome Extension (Side Panel)
         │
         │  Supabase JS SDK (WebSocket + REST)
         │
    Supabase Cloud
    ├── Auth          (email/password, sessions)
    ├── PostgreSQL    (messages, direct_messages, profiles)
    └── Realtime      (postgres_changes → WebSocket push)
```

- When you send a message → inserted into Supabase `messages` table
- Both users have a Realtime subscription on that `room_url`
- Supabase pushes the INSERT event to all subscribers instantly
- Same mechanism for DMs via `direct_messages` table

---

## Troubleshooting

**"Missing Supabase env vars" error**
→ Make sure `.env` exists and has both values filled in. Rebuild after editing `.env`.

**Messages not appearing in real-time**
→ Check Supabase Dashboard → Database → Replication → confirm `messages` is enabled under `supabase_realtime`.

**"duplicate key" on username during signup**
→ That username is taken. Try a different one.

**Extension won't load in Chrome**
→ Make sure icons exist in `public/icons/`. Chrome requires all icon files listed in `manifest.json`.

**"Invalid login credentials"**
→ Email confirmation might still be ON. Check Auth → Providers → Email → Confirm email = OFF.

**Friend can't see my messages**
→ Confirm you're both using the exact same Supabase project URL and anon key in `.env`.

---

## File Structure Reference

```
ningi/
├── manifest.json           Chrome extension manifest (MV3)
├── vite.config.js          Vite + CRXJS config
├── package.json
├── sidepanel.html          Side panel entry HTML
├── .env                    YOUR credentials (don't share)
├── .env.example            Template to copy
├── supabase-schema.sql     Run this in Supabase SQL Editor
├── zip.cjs                 Build → ZIP script
└── src/
    ├── background/
    │   └── index.js        Opens side panel on icon click
    └── sidepanel/
        ├── main.jsx        React entry point
        ├── App.jsx         Root component / auth gate
        ├── index.css       All styles
        ├── lib/
        │   ├── supabase.js Supabase client
        │   └── urlUtils.js URL normalization helpers
        ├── stores/
        │   ├── authStore.js Zustand auth state
        │   └── appStore.js  Zustand UI state
        ├── pages/
        │   ├── AuthPage.jsx Sign in / Sign up
        │   ├── ChatPage.jsx Global URL room chat
        │   └── DMPage.jsx   Direct messages
        └── components/
            ├── Header.jsx
            ├── UrlDropdown.jsx
            ├── MessageBubble.jsx
            ├── MessageInput.jsx
            └── UserAvatar.jsx
```
