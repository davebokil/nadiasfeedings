# CLAUDE.md

Shared baby-feeding log for two parents. Nuxt 4 static SPA (`ssr: false`) + Firebase Auth (Google) +
Firestore, deployed to GitHub Pages by `.github/workflows/deploy.yml`. See README.md for setup.

## Commands
- `npm run dev` — dev server (demo mode with in-memory data if no `.env` Firebase config)
- `npm test` — vitest, `tests/analytics.test.ts` (synthetic data; keep it that way)
- `npx nuxt typecheck` — must stay clean
- `npm run build` — `nuxt generate` → `.output/public`

## Architecture
- `app/utils/analytics.ts` — **all trend math** as pure functions of `(feeds, now)`. Add new stats here,
  with a test, not inside components.
- `app/utils/guidelines.ts` — intake ranges by age/weight (sources in the file header).
- `app/utils/time.ts` — feed times are local wall-clock strings `YYYY-MM-DDTHH:MM`; never convert them
  to UTC/ISO. Compare and sort them as strings.
- `app/services/backend.ts` — the `Backend` interface. `firebase.ts` implements it; `demo.ts` is a
  local fake. Components never import Firebase directly — go through `useFeedLog()`.
- `app/composables/useFeedLog.ts` — module-level singleton store (client-only SPA). Subscribes once
  per sign-in to feeds from the last `LIVE_WINDOW_DAYS` (60); older days load on demand.
- `app/components/*` — views and hand-drawn SVG charts (no chart library).
- Styling: plain CSS in `app/assets/main.css` with CSS variables for light/dark.

## Data & security
- Collections: `feeds/{id}`, `meta/baby`. Field shapes are enforced in `firestore.rules`
  (`validFeed`, `validBaby`) — if you add a field, update the rules' `hasOnly` list too, then
  `npm run deploy:rules`, or writes will be rejected with `permission-denied`.
- Access is an email allowlist: `ALLOWED_EMAILS` in `.env` is filled into the `__ALLOWED_EMAILS__` placeholder
  by `scripts/build-rules.mjs` → git-ignored `firestore.deploy.rules`. Never put real emails in `firestore.rules`.
- Never commit `.env`, `service-account*.json`, `data/*.json`, `backups/`, or `public/demo-data.json`
  (all git-ignored). The repo is public for GitHub Pages; personal data must stay out of it.
- Firebase web config (`NUXT_PUBLIC_FIREBASE_*`) is public by design; it's injected at build time from
  GitHub Actions repository variables.

## Conventions
- TypeScript, `<script setup>`, Nuxt auto-imports for `utils/` and `composables/`.
- Mobile-first: test at 390px wide. The app is used one-handed at 3am — keep tap targets big and
  the add flow to two taps.
- Copy about intake ranges stays non-alarming and points to the pediatrician; no medical advice.
