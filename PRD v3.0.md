# FocusFlow – Product Requirements Document (PRD) v3.1
**Last Updated:** 2026-05-21  
**Project Status:** Phase 1 complete; Phase 2 partially integrated (auth + profile), session sync blocked by schema issues

---

## 1. Executive Summary

FocusFlow is a biologically‑aware deep work orchestrator that automates evidence‑based work protocols derived from chronobiology (ultradian rhythms, BRAC) and cognitive neuroscience (dopamine contrast, dorsal attention network activation, NSDR recovery). It eliminates decision fatigue by managing timers, micro‑pauses, and recovery troughs.

The app runs as a **Progressive Web App (PWA)** on iOS and Android, with planned **Windows desktop (Tauri)** support. All state synchronises in real time via Supabase.

**Key scientific corrections applied (v3.0):**  
- Reduced wall‑stare from 10 min to **2‑min sensory reset + 60‑sec visual fixation**.  
- Micro‑pauses are **passive anti‑habituation blinks** (no memory consolidation claims).  
- **Hybrid timer architecture** – server‑master for macro boundaries (≥5 min), client‑side Web Worker for micro‑pauses (10 sec).  
- **Pause constraints** – Protocol A: no pause; Protocol B: max 1 pause per block, max 3 minutes, auto‑trough after timeout.  
- **Micro‑pause pre‑alert** – 3‑second ascending chime before the 10‑sec rest, end chime to signal resumption.

---

## 2. Product Vision & Objectives

| Objective | Success Metric |
|-----------|----------------|
| Automate protocol compliance | ≥90% session completion rate without manual intervention |
| Cross‑device consistency | <500 ms sync latency for macro phases |
| Quantify biological productivity | Dashboard showing DWS, efficiency, lifetime projections |
| Respect third‑party ecosystems | Native timer; Pomofocus integration via CSV export |

---

## 3. Target Platforms & Architecture

| Platform | Delivery | Status |
|----------|----------|--------|
| Windows 10/11 | Tauri (Rust + WebView2) | 🔜 Phase 3 |
| iOS | Safari PWA | ✅ Phase 1 |
| Android | Chrome PWA | ✅ Phase 1 |
| macOS/Linux | Tauri (future) | 🔜 Future |

**Sync Architecture:** Supabase (PostgreSQL + Realtime) handles auth, session state, and analytics.

---

## 4. Core Feature Specification

### 4.1 Protocol A – “The Anchor” (Low‑Medium Cognition)
- **Phases:** 2‑min sensory reset → 60‑sec visual priming → 3×(25‑min sprint + 5‑min micro‑rest) → 20‑min trough.  
- **Total:** ~107 minutes.  
- **Pause button:** ❌ Not allowed (blocked in UI).  
- **Skip button:** ✅ Only on micro‑rest and trough.  
- **Abort (X):** ✅ Always visible.  
- **Status:** Fully implemented and stable.

### 4.2 Protocol B – “The Dive” (High Cognition)
- **Phases:** 60‑sec visual priming → 90‑min deep block with random 10‑sec micro‑pauses → 20‑min trough.  
- **Total:** ~111.5 minutes.  
- **Pause button:** ✅ Allowed once per block, max 3 minutes, auto‑jump to trough after timeout.  
- **Micro‑pauses:** 3‑sec pre‑alert chime, 10‑sec passive rest (“Do nothing. Relax your eyes.”), end ding.  
- **Skip button:** ✅ Only on trough.  
- **Abort (X):** ✅ Always visible.  
- **Status:** Fully implemented and stable.

### 4.3 ADHD / Executive Dysfunction Mode (Phase 4)
- Not yet implemented.

---

## 5. Hybrid Timer Architecture (Implemented)

### 5.1 Macro Orchestrator (Hard Boundaries)
- **Current:** Client‑side `setInterval` + localStorage fallback.  
- **Planned:** Supabase Edge Functions + pg_cron + Web Push.  
- **Status:** 🔜 Phase 2 (blocked by schema issues).

### 5.2 Micro‑Pause Engine (Soft Boundaries)
- **Implemented:** Web Worker with random intervals (3‑8 min), 3‑sec pre‑alert, 10‑sec pause, end ding.  
- **Status:** ✅ Fully functional.

### 5.3 Pause Constraints (Research‑Backed)
- Protocol A: no pause button (UI hides it).  
- Protocol B: max 1 pause per block, auto‑trough after 3 minutes (tested and working).  
- **Status:** ✅ Implemented and stable.

---

## 6. Cross‑Platform Sync Architecture

- **Authentication:** ✅ Email + Google OAuth (Supabase Auth).  
- **User Profiles:** ✅ Age, chronotype, life expectancy saved to `user_profiles`.  
- **Session persistence:** ⚠️ **Partially broken** – Supabase `sessions` and `phases` inserts fail due to missing `updated_at` column and missing unique constraint on `phases`. LocalStorage fallback works.  
- **Real‑time sync:** 🔜 Not yet implemented.  

**Immediate fix required:**  
- Add `updated_at` column to `sessions` table.  
- Add unique constraint `(session_id, phase_index)` on `phases` table.  

---

## 7. Analytics Engine

| Metric | Formula | Status |
|--------|---------|--------|
| Deep Work Score (DWS) | Σ(minutes × weight) | ⚠️ Computed but not saved (no session data) |
| Efficiency Ratio | DWS / total session time | ⚠️ Same |
| Lifetime projections | Based on profile age | ⚠️ Needs session history |
| Trough compliance | Completed troughs / total troughs | ⚠️ Same |
| Micro‑pause fidelity | Delivered / (Delivered + Missed) | ⚠️ Same |

**Current display:** “No Data Yet” because no sessions have been saved to Supabase. Once session saving works, analytics will populate.

---

## 8. UI/UX Philosophy (Implemented)

- **Ghost Mode Bar:** Fixed top bar with phase color, progress, pause/skip/abort buttons (research‑aligned visibility).  
- **Mobile overlay:** Works, but missing lock screen widgets (Phase 4).  
- **Global Hotkeys:** 🔜 Phase 3.

---

## 9. Technical Stack – Current Status

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | React 18 + TypeScript + Tailwind | ✅ |
| State Management | Zustand + Immer | ✅ |
| Timer Engine | Web Worker (micro) + setInterval (macro) | ✅ |
| Persistence | localStorage (fallback) + Supabase (broken) | ⚠️ |
| PWA | VitePWA + Workbox | ✅ |
| Authentication | Supabase Auth | ✅ |
| Backend | Supabase (tables exist) | ⚠️ Schema incomplete |
| Notifications | Web Push (not yet integrated) | 🔜 |
| Desktop | Tauri (not started) | 🔜 |

---

## 10. Development Roadmap – Updated

### Phase 1: Foundation ✅ COMPLETE
- All core timer logic, micro‑pauses, UI components, persistence, research‑aligned controls.

### Phase 2: Backend Integration & Sync (IN PROGRESS – BLOCKED)

| Step | Status | Next Action |
|------|--------|-------------|
| 2.1 Supabase project setup | ✅ Done | – |
| 2.2 Environment variables | ✅ Done | – |
| 2.3 Authentication | ✅ Done | – |
| 2.4 User profile creation | ✅ Done | – |
| 2.5 Save sessions to Supabase | ⚠️ **Blocked** | Add `updated_at` column to `sessions`; add unique constraint to `phases` |
| 2.6 Web Push notifications | 🔜 | Generate VAPID keys, implement subscription |
| 2.7 Edge Functions | 🔜 | Deploy macro‑orchestrator and fallback‑trigger |
| 2.8 Real‑time sync | 🔜 | Subscribe to session changes |

### Phase 3: Desktop Native App (Tauri)
- Not started.

### Phase 4: Advanced Features & Polish
- Not started.

---

## 11. Open Risks & Mitigations

| Risk | Mitigation | Status |
|------|------------|--------|
| Supabase session inserts fail | Add missing columns/constraints | ⚠️ Immediate fix |
| No session data → analytics empty | Fix saving, then backfill | ⚠️ |
| Pomofocus has no API | Export‑only CSV | 🔜 |
| iOS kills background timers | Server‑master for macro phases | 🔜 |
| AudioContext requires user gesture | Add “Tap to enable sound” overlay | 🔜 |

---

## 12. Appendix: Research Corrections Applied (v3.0 → v3.1)

All research corrections from v3.0 remain valid. No new corrections needed.

**Immediate action:** Fix Supabase schema as described in §6 and §10. Then test session saving. Once sessions appear in Supabase, analytics will start showing data.