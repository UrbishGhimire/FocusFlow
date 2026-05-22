# Development

This file is for maintaining and shipping FocusFlow. It is intentionally separate from the user-facing README.

## Prerequisites

- Node.js 18+
- npm
- Rust toolchain for Tauri desktop builds
- Supabase CLI if you are working on backend functions or migrations

## Local setup

```bash
npm install
npm run dev
```

## Common build commands

```bash
npm run build
npm run tauri build
npm run tauri:build:windows
```

## Windows installer

The verified Windows installer build is produced by:

```bash
npm run tauri:build:windows
```

The NSIS installer is emitted under:

```text
src-tauri/target/release/bundle/nsis/
```

## Supabase

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy macro-orchestrator
supabase functions deploy fallback-trigger
```

## Release flow

GitHub Actions builds the Windows installer when you push a tag like `v0.1.0`.

```bash
git tag v0.1.0
git push origin v0.1.0
```

The release workflow is in `/.github/workflows/release.yml`.
