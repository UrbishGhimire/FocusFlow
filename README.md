# FocusFlow

A biologically-aware deep work orchestrator implementing the Ultradian Flow Protocols.

## Architecture

- **Frontend:** React 18 + TypeScript + Tailwind CSS + Zustand
- **Desktop:** Tauri (Rust) for Windows 10/11
- **Mobile:** Progressive Web App (PWA) for iOS Safari & Android Chrome
- **Backend:** Supabase (PostgreSQL + Realtime + Edge Functions)
- **Timer Engine:** Hybrid architecture
  - **Macro Orchestrator:** Server-master clock for hard boundaries (25/90/5/20 min)
  - **Micro-Pause Engine:** Client-side Web Worker for soft boundaries (10 sec)

## Protocols

### Protocol A: The Anchor

For low-medium cognition, resistance, and task paralysis.

- 2-min sensory reset + 60-sec visual priming
- 3 × 25-min sprints with 5-min micro-rests
- 20-min ultradian trough recovery

### Protocol B: The Dive

For high cognition, memorization, and complex understanding.

- 60-sec DAN priming (visual fixation)
- 90-min continuous deep block with random 10-sec anti-habituation blinks
- 20-min NSDR trough for memory consolidation

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Rust (for Tauri desktop build)
- Supabase CLI (for backend)

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Build PWA
npm run build

# Build Windows desktop app (requires Rust)
npm run tauri build

# Build the Windows installer (NSIS)
npm run tauri:build:windows
```

### Windows Installer

The verified installer build command is:

```bash
npm run tauri:build:windows
```

On success, the NSIS installer is emitted at:

```text
src-tauri/target/release/bundle/nsis/FocusFlow_0.1.0_x64-setup.exe
```

If you need to rebuild only the desktop bundle, you can also run:

```bash
cd src-tauri
cargo tauri build
```

### Supabase Setup

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy macro-orchestrator
supabase functions deploy fallback-trigger

# Enable pg_cron for scheduled notifications
supabase sql
```

Enable pg_cron extension and schedule the macro orchestrator:

```sql
SELECT cron.schedule('macro-orchestrator', '*/15 seconds', $$SELECT net.http_get('https://your-project.functions.supabase.co/macro-orchestrator')$$);
```

## Project Structure

```
src/
  components/       # React UI components
  stores/           # Zustand state management
  hooks/            # React hooks (Wake Lock, Notifications)
  workers/          # Web Workers (Micro-Pause Engine)
  lib/              # Utilities (protocols, analytics, supabase)
  types/            # TypeScript type definitions

supabase/
  migrations/       # Database schema
  functions/        # Edge Functions (Macro Orchestrator, Fallback)
```

## License

MIT

## CI / Releases (GitHub)

This repo includes a GitHub Actions workflow that builds the app and uploads the Windows NSIS installer to a GitHub Release when you push a tag like `v0.1.0`.

- Create a private repository on GitHub and push this project (see instructions below).
- The workflow file is at `/.github/workflows/release.yml` and runs on `windows-latest`.
- The workflow expects the default `GITHUB_TOKEN` secret (provided automatically by Actions) to create releases and upload the installer.

Quick steps to create and push a private repo (run locally):

```bash
# create repo (using GitHub CLI) - replace <owner>/<repo>
gh repo create <owner>/<repo> --private --source . --remote origin --push

# or with plain git:
git init
git add -A
git commit -m "chore: initial commit"
git remote add origin git@github.com:<owner>/<repo>.git
git branch -M main
git push -u origin main
```

After pushing, create a tag and push it to trigger the release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Replace `<owner>` and `<repo>` and then update `src-tauri/tauri.conf.json` replacing the placeholders in the `updater.endpoints` entry with your GitHub owner and repo.
