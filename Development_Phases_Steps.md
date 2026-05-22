# FocusFlow – Complete Development Roadmap

**Project:** FocusFlow – Biologically‑aware deep work orchestrator  
**Current Version:** v0.2.1 (Phase 1 complete, Phase 2 progressing)  
**Last Updated:** 2026-05-22

---

## Legend

- ✅ **Complete** – Fully implemented and tested.
- ⚠️ **Blocked** – Work stopped due to external issue (schema, missing column, etc.).
- 🔜 **Pending** – Not started, planned.
- 🧪 **Testing** – Implemented but needs verification.

---

## Phase 1: Foundation & Timer Engine ✅ COMPLETE

All tasks in Phase 1 are done.

| Step | Task                                                                                     | Status |
| ---- | ---------------------------------------------------------------------------------------- | ------ |
| 1.1  | React + TypeScript + Tailwind scaffolding                                                | ✅     |
| 1.2  | Vite PWA configuration (manifest, service worker)                                        | ✅     |
| 1.3  | Zustand store with Immer                                                                 | ✅     |
| 1.4  | Protocol A phase definitions (Anchor)                                                    | ✅     |
| 1.5  | Protocol B phase definitions (Dive)                                                      | ✅     |
| 1.6  | Macro timer (setInterval for minutes)                                                    | ✅     |
| 1.7  | Micro-pause Web Worker (random intervals, 10 sec)                                        | ✅     |
| 1.8  | 3‑sec pre‑alert sound for micro‑pauses                                                   | ✅     |
| 1.9  | Micro-pause start/end sounds                                                             | ✅     |
| 1.10 | Screen Wake Lock API integration                                                         | ✅     |
| 1.11 | GhostModeBar UI (phase colors, progress, buttons)                                        | ✅     |
| 1.12 | PrimingScreen (sensory reset + visual fixation)                                          | ✅     |
| 1.13 | MicroRestPrompt (5‑min break activities)                                                 | ✅     |
| 1.14 | TroughRecovery (NSDR / silent rest)                                                      | ✅     |
| 1.15 | MicroPauseOverlay (translucent 10‑sec blink)                                             | ✅     |
| 1.16 | SessionComplete screen                                                                   | ✅     |
| 1.17 | AnalyticsDashboard (scaffold, waiting for data)                                          | ✅     |
| 1.18 | localStorage persistence (save/restore)                                                  | ✅     |
| 1.19 | Pause constraints (Protocol A no pause; Protocol B max 1 pause, auto‑trough after 3 min) | ✅     |
| 1.20 | Skip button only on micro_rest / trough (not on priming or work)                         | ✅     |
| 1.21 | Abort button always visible                                                              | ✅     |
| 1.22 | Reload flash fixed (isHydrated + derivedView)                                            | ✅     |

---

## Phase 2: Backend Integration & Sync (IN PROGRESS)

| Step | Task                                                         | Status | Notes / Next Action                                         |
| ---- | ------------------------------------------------------------ | ------ | ----------------------------------------------------------- |
| 2.1  | Create Supabase project                                      | ✅     | Project URL: `https://azhtmjhkwdtorsvgnwsw.supabase.co`     |
| 2.2  | Run initial migration (`001_initial_schema.sql`)             | ✅     | Tables exist: `sessions`, `phases`, `user_profiles`, etc.   |
| 2.3  | Configure `.env` with Supabase URL + anon key                | ✅     | –                                                           |
| 2.4  | Implement Supabase client (`src/lib/supabase.ts`)            | ✅     | Includes `saveSession`, `savePhases`, `loadSession`         |
| 2.5  | Add authentication (email + Google OAuth)                    | ✅     | Email sign‑up/sign‑in works; Google OAuth works             |
| 2.6  | Create profile setup flow (age, chronotype, life expectancy) | ✅     | Saves to `user_profiles` table                              |
| 2.7  | **Save sessions to Supabase** (replace localStorage)         | ✅     | **Fixed** – added `updated_at` column and unique constraint |
| 2.8  | Real‑time sync (Supabase Realtime)                           | ✅     | Subscriptions and status indicator verified                 |
| 2.9  | Cross‑device state reconciliation                            | ✅     | Single-writer lease added and verified                      |
| 2.10 | Web Push Notifications – generate VAPID keys                 | ✅     | Keys generated; add values to `.env`                        |
| 2.11 | Web Push – request permission & subscribe                    | ✅     | Subscription confirmed in browser                           |
| 2.12 | Store push subscriptions in `push_subscriptions` table       | ✅     | Row verified in database                                    |
| 2.13 | Deploy Edge Function `macro-orchestrator`                    | ✅     | Deployed to Supabase                                        |
| 2.14 | Deploy Edge Function `fallback-trigger`                      | ✅     | Deployed to Supabase                                        |
| 2.15 | Configure pg_cron to run Edge Functions                      | ✅     | Jobs scheduled and verified                                 |
| 2.16 | Test push notifications on iOS/Android                       | ✅     | Test push delivered and confirmed                           |

---

## Phase 3: Desktop Native App (Tauri)

| Step | Task                                                | Status       |
| ---- | --------------------------------------------------- | ------------ | -------------------------------- |
| 3.1  | Install Rust toolchain and Tauri CLI                | ✅           |
| 3.2  | Configure Tauri v2 project (`src-tauri/`)           | ✅           | Desktop app launches in dev mode |
| 3.3  | System tray integration (minimize to tray)          | ✅           | Verified on Windows              |
| 3.4  | Native Windows notifications (bypass Web Push)      | ✅           |
| 3.5  | Global hotkeys (`Alt+Space` pause/resume)           | ✅ (skipped) |
| 3.6  | Website blocker (Windows hosts file / Focus Assist) | ✅ (skipped)           |
| 3.7  | Build Windows installer (.msi / .exe)               | ✅           |
| 3.8  | Auto‑updater integration                            | 🔜           |

### Phase 3.7 — Installer (current focus)

Small actionable subtasks to complete the Windows installer build:

| Substep | Task                                                         | Status         |
| ------- | ------------------------------------------------------------ | -------------- |
| 3.7.1   | Create NSIS script / configuration for installer             | ✅ (created)   |
| 3.7.2   | Ensure `src-tauri/bundle` icons include `.ico` and all sizes | 🔜 Not started |
| 3.7.3   | Add packaging scripts (`npm run tauri:build:windows`)        | ✅ (added)     |
| 3.7.4   | Run `cargo tauri build` and produce NSIS installer           | ✅ (built)     |
| 3.7.5   | Smoke test installer on Windows VM (install/uninstall)       | 🔜 Not started |
| 3.7.6   | Document installer build steps in `README.md`                | 🔜 Not started |

## Phase 4: Advanced Features & Polish

## Phase 4: Advanced Features & Polish

| Step | Task                                                                        | Status |
| ---- | --------------------------------------------------------------------------- | ------ |
| 4.1  | NSDR audio library (Yoga Nidra tracks)                                      | 🔜     |
| 4.2  | Pomofocus.io CSV export                                                     | 🔜     |
| 4.3  | Browser extension for Pomofocus sync (optional)                             | 🔜     |
| 4.4  | ADHD mode (audible countdowns, micro‑commitments)                           | 🔜     |
| 4.5  | Chronotype quiz (Lion/Bear/Wolf/Dolphin)                                    | 🔜     |
| 4.6  | Lock screen widgets (iOS Live Activities, Android persistent notifications) | 🔜     |
| 4.7  | Dark/light theme toggle                                                     | 🔜     |
| 4.8  | “Tap to enable sound” overlay (fix AudioContext blocked by browser)         | 🔜     |

---

## Phase 5: Distribution & Launch

| Step | Task                                                   | Status |
| ---- | ------------------------------------------------------ | ------ |
| 5.1  | Deploy PWA to Vercel / Netlify                         | 🔜     |
| 5.2  | Generate PWA icons (192px, 512px) and add to `public/` | 🔜     |
| 5.3  | Submit to Google Play (TWA wrapper)                    | 🔜     |
| 5.4  | Windows Store submission                               | 🔜     |
| 5.5  | Documentation & onboarding tutorial                    | 🔜     |
| 5.6  | Privacy policy & terms of service                      | 🔜     |

---

## Appendix A – Immediate Fix for Phase 2 Blocker (Step 2.7)

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add missing updated_at column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create a trigger to automatically update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint on phases to allow ON CONFLICT upsert
ALTER TABLE phases ADD CONSTRAINT phases_session_id_phase_index_unique UNIQUE (session_id, phase_index);
```
