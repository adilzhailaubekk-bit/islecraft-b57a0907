# Project Rules

## Repository Identity

- Work in the Git checkout for `https://github.com/adilzhailaubekk-bit/islecraft-b57a0907.git`.
- Before edits, verify the current folder, Git remote, branch, and whether duplicate local clones exist.
- Do not edit a duplicate/old clone unless the user confirms it is the correct project folder.

## App Type And Vercel

- App type: TanStack Start / Nitro SSR app built with Vite.
- Vercel Root Directory: repository root.
- Vercel Framework Preset: Other.
- Vercel Install Command: `npm ci`.
- Vercel Build Command: `npm run build`.
- Vercel Output Directory: leave empty/default because Nitro with `NITRO_PRESET=vercel` creates `.vercel/output`.
- Keep `NITRO_PRESET=vercel` in `vercel.json` build/runtime env so Vercel receives SSR output instead of only a plain `dist/`.
- This repo has both `package-lock.json` and `bun.lock`; `package.json` pins `packageManager` to npm and `vercel.json` pins `npm ci` so Vercel does not accidentally build with Bun.
- Do not add SPA rewrites for this app unless it is converted to a static SPA. TanStack Start SSR should be deployed through Nitro output.

## Environment Variables And Secrets

- Never commit real `.env` files.
- Keep `.env`, `.env.*`, `VERCEL_ENV_IMPORT.local.env`, and `VERCEL_ENV_VALUES.local.md` ignored.
- Keep `.env.example` committed with names only and no secret values.
- Public browser variables such as `VITE_*` are visible to users. Never put private secrets in `VITE_*`.
- If `.env` exists locally, create `VERCEL_ENV_IMPORT.local.env` from its actual values for Vercel import/paste, but never print those values in chat.
- Create `VERCEL_ENV_VALUES.local.md` with human-friendly labels and add values in Vercel Project Settings for Production, Preview, and Development.

## Supabase

- `SUPABASE_URL`: base Supabase project URL, no `/rest/v1`.
- `SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key for server-side auth/client creation.
- `VITE_SUPABASE_URL`: same base Supabase project URL, exposed to browser.
- `VITE_SUPABASE_PROJECT_ID`: Supabase project ref, the part before `.supabase.co`.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/public key, exposed to browser.
- `SUPABASE_SERVICE_ROLE_KEY`: secret backend/server-only key. Never expose it as `VITE_*`.
- Current code reads and updates `profiles` through the normal Supabase client under RLS, so service role is not required for current runtime behavior.
- The generated `supabaseAdmin` client exists but is not imported elsewhere. Require `SUPABASE_SERVICE_ROLE_KEY` only if future backend code imports that admin client for RLS-bypass/admin actions.
- Migrations are SQL files that create or update database tables. This repo has Supabase migrations under `supabase/migrations`.
- Supabase project ref found in `supabase/config.toml`: `tcnnemcyjvzdiwosjewf`.
- If Supabase reports `Could not find the table ... in the schema cache`, apply the migration SQL to the target project.

## Gemini And AI Keys

- This repo currently has no Gemini integration.
- If Gemini is added later, `GEMINI_API_KEY` must be backend/server-only and never `VITE_*`.
- Use `GEMINI_MODEL=gemini-2.5-flash-lite` by default for student projects unless the user explicitly asks for another model.

## CSS And Fonts

- If CSS has remote `@import url("https://...")` font imports, those imports must appear before all other CSS rules.
- Prefer document/head font links if remote font imports cause Vite or Lightning CSS ordering errors.
- Do not hide CSS build errors by disabling overlays; fix the import/order issue.

## Before Deploy

- Confirm remote is `https://github.com/adilzhailaubekk-bit/islecraft-b57a0907.git` and branch is `main`.
- Confirm Vercel settings: root repo, preset Other, install `npm ci`, build `npm run build`, output default.
- Confirm all required Supabase variables are set in Vercel Production, Preview, and Development.
- Confirm `.env` and local Vercel handoff files are ignored.
- Confirm `.env.example` is committed and contains no real values.
- Confirm database migrations have been applied to Supabase project `tcnnemcyjvzdiwosjewf`.
- Run `npm run build` before redeploying.
