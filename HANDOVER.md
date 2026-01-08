# 📘 Journaly - Project Handover & Technical Documentation

**Date:** Jan 3, 2026
**Status:** Stable / MVP Complete
**Branch:** `main`

## 🚀 Project Overview
**Journaly** is an AI-powered voice journaling application.
- **Core Value:** Users record their day via voice, and AI (Gemini) analyzes the audio to provide summaries, mood tracking, tags, and action items.
- **Tech Stack:**
    - **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4.
    - **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions).
    - **AI:** Google Gemini API (Multimodal/Flash).
    - **Payments:** Stripe (via Supabase Edge Functions).

---

## 🛠️ Key Features Implemented

### 1. Voice Session (`components/VoiceSession.tsx`)
The heart of the app.
- **Audio Recording:** Uses `useGeminiLive` hook (WebSockets/Gemini Realtime API) for streaming audio.
- **AI Analysis:** After the user stops recording:
    1.  Wait 2s for buffer flush.
    2.  Sends transcript to Gemini (`gemini-2.0-flash`).
    3.  **Prompt Logic:** strict JSON extraction of:
        - `summary`: Concise summary.
        - `mood`: Enum [GREAT, GOOD, NEUTRAL, BAD, TERRIBLE]. *Note: Prompt forced to avoid "Neutral" default.*
        - `tags`: 3-5 keywords.
        - `actionItems`: Array of tasks detected in speech.
- **Saving:** Data is inserted into Supabase `entries` table.

### 2. Dashboard (`components/Dashboard.tsx`)
- **Dynamic Greeting:** Based on time of day.
- **Daily Limit System:**
    - **Free Tier:** 30 seconds/day.
    - **Pro Tier:** 20 minutes/day.
    - *Implementation:* Calculates `todayUsageSeconds` from user profile.
- **Widgets:**
    - **Mood Card:** Displays dynamic emoji based on last entry's mood (e.g., 🤩 for GREAT, 😔 for BAD).
    - **Action Items:** Lists extracted tasks. Users can check them off (optimistic UI update).

### 3. Analytics (`components/Analytics.tsx`)
- **Visualizations:**
    - **Mood Trend:** Area Chart (Recharts) showing emotional evolution over the last 7 days.
    - **Mood Distribution:** Pie Chart showing breakdown of moods.
    - **Top Tags:** Word cloud style (font size based on frequency), **filtered to last 30 days**.
- **Pro Lock:** Analytics are visible to all but "Pro" banner suggests upgrade (logic ready for stricter gating).

### 4. Settings & Customization
- **I18n:** Fully localized (English/French) via `i18n.ts` and `SettingsContext`.
- **Personalities:** Users can choose AI persona (Empathetic, Coach, Direct).
- **Dark Mode:** Refined palette (Emerald/Slate).

---

## 🗄️ Database Schema (Supabase)

### `profiles` (Public)
- `id` (references auth.users)
- `tier`: 'FREE' | 'PRO'
- `stripe_customer_id`: string
- `subscription_status`: 'active' | 'inactive'
- `today_usage_seconds`: integer (reset daily via cron/logic)

### `entries` (Public)
- `id`: uuid
- `user_id`: uuid
- `transcript`: text
- `summary`: text
- `mood`: text (Enum)
- `tags`: text[] (Array)
- `action_items`: jsonb `[{ id, text, completed }]`
- `created_at` / `date`: timestamptz

---

## ⚠️ Technical Context & Recent Fixes

### Build & Environment
- **Vite Types:** Added `vite-env.d.ts` to support `import.meta.env`.
- **TypeScript:** `tsconfig.json` excludes `supabase/` folder to prevent Deno type conflicts with Node/Client code.
- **API Keys:**
    - `VITE_GEMINI_API_KEY`: Required in `.env`.
    - `VITE_SUPABASE_URL` / `ANON_KEY`: standard.

### Known Behaviors
- **Voice Analysis Latency:** We added a deliberate UI state "Analyse en cours..." to mask the Gemini API latency.
- **Strict Moods:** The AI is instructed *not* to default to specific neutral states unless truly neutral.

---

## 📱 Next Steps: iOS Deployment
**Goal:** Wrap this web app for iOS using **Capacitor**.

**Checklist for Claude:**
1.  Initialize Capacitor: `npm install @capacitor/core @capacitor/cli @capacitor/ios`.
2.  Build the web app: `npm run build` (outputs to `dist`).
3.  Add iOS platform: `npx cap add ios`.
4.  **Permissions:** You must configure `Info.plist` for **Microphone Usage** (`NSMicrophoneUsageDescription`) or the app will crash on voice start.
5.  **Safe Area:** Check `index.css` for `padding-top: env(safe-area-inset-top)` to handle the notch.

Good luck! 🚀
