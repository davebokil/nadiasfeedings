# Nadia's Feedings 🍼

A small shared feeding log for two parents: log bottles in two taps, see each day's history, and get
trend tips ("she's usually had 15.8 oz by 2:30pm — she's 5.8 oz behind"), plus a comparison against
typical intake for her age.

**Stack:** Nuxt 4 (static SPA) · Firebase Auth (Google sign-in) · Cloud Firestore · GitHub Pages.
Everything runs on free tiers with no credit card.

```
app/
  app.vue                 shell: header, tabs, add button
  components/             TodayView, HistoryView, TrendsView, PaceChart, DailyChart, GuidelineCard, FeedSheet…
  composables/useFeedLog  auth + live Firestore data (single shared store)
  services/               Backend interface → firebase.ts (real) / demo.ts (local, no config)
  utils/analytics.ts      all the trend math (pure functions, unit-tested)
  utils/guidelines.ts     age/weight intake ranges
firestore.rules           who can read/write (allowlist filled in from ALLOWED_EMAILS in .env)
scripts/import.mjs        one-time migration from data/export.json
scripts/backup.mjs        download everything to backups/*.json
.github/workflows/        build + deploy to GitHub Pages on push to main
```

---

## Setup (about 20 minutes, once)

### 1. Run it locally

```bash
npm install
npm run dev            # http://localhost:3000 — runs in demo mode until Firebase is configured
```

To try demo mode with your real numbers: `cp data/export.json public/demo-data.json` (git-ignored).

### 2. Create the Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** (Google Analytics: off). Stay on the free **Spark** plan.
2. **Build → Firestore Database → Create database** → *Production mode* → pick a US location (e.g. `nam5`).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
4. **Authentication → Settings → Authorized domains → Add domain:** `<your-github-username>.github.io`
   (`localhost` is already there for dev).
5. **Project settings (⚙) → General → Your apps → Web (`</>`)** → register an app (no hosting).
   Copy `apiKey`, `authDomain`, `projectId`, `appId` into a `.env` file:

   ```bash
   cp .env.example .env    # then fill in the four NUXT_PUBLIC_FIREBASE_* values
   ```

   These values are public identifiers, not secrets — access is controlled by `firestore.rules`.

### 3. Lock it to your family

Put the two Google accounts you'll sign in with in `.env` as `ALLOWED_EMAILS=you@gmail.com,spouse@gmail.com`.
**Don't** write them into `firestore.rules`: this repo is public. `npm run deploy:rules` fills them into the
git-ignored `firestore.deploy.rules` (which `firebase.json` points at) and deploys it:

```bash
npx firebase-tools login
cp .firebaserc.example .firebaserc   # put your project id in it
npm run deploy:rules
```

> Rules start as "deny everything" in production mode, so nothing works until this step is done.

### 4. Migrate the existing log

1. **Project settings → Service accounts → Generate new private key.** Save it in the repo folder as
   `service-account.json` (already git-ignored — never commit it).
2. Run:

   ```bash
   node scripts/import.mjs --dry-run          # checks the file: 114 feeds from 2026-11-04 to 2026-11-15
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run import-data
   ```

   Re-running is safe — feeds keep their ids, so nothing duplicates.
3. Check it: `npm run dev`, sign in with Google, and you should see all the history.

**Feeds logged in the old Claude app after this export won't be included.** Stop using the old app once
you switch, or add any stragglers by hand in the new one.

### 5. Deploy to GitHub Pages

1. Push this repo to GitHub (`main` branch). On a free GitHub plan Pages needs a **public** repo — that's
   fine: the code and Firebase web config are safe to publish, and your data lives in Firestore behind the
   rules. `data/*.json`, `.env` and the service-account key are all git-ignored.
2. **Repo → Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Repo → Settings → Secrets and variables → Actions → Variables tab** → add
   `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`.
4. Push (or re-run the workflow). The site appears at `https://<username>.github.io/<repo>/`.
5. On each phone: open it in Safari → Share → **Add to Home Screen**. It opens full-screen like an app.

---

## Everyday

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Tests (analytics math) | `npm test` |
| Typecheck | `npx nuxt typecheck` |
| Production build | `npm run build` (→ `.output/public`) |
| Deploy | push to `main` |
| Back up the data | `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run backup` |
| Restore a backup | `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/import.mjs backups/feeds-YYYY-MM-DD.json` |
| Change the allowlist | edit `ALLOWED_EMAILS` in `.env`, `npm run deploy:rules` |

## Data model (Firestore)

```
feeds/{id}   { at: "2026-11-14T13:30", oz: 3, formula: false, note: "", byName: "Dave", created, edited? }
meta/baby    { name: "Nadia", birth: "2026-08-20", weightLb: 11.2 | null, weighedOn: "2026-11-20" | null }
```

`at` is local wall-clock time stored as a string, so it sorts as text and reads the same on both phones.
The app keeps the last 60 days live and loads older days on demand (History → "Load older"), which keeps
Firestore reads tiny.

## Free-tier headroom

Firestore Spark: 50K reads, 20K writes/day, 1 GiB storage. This app uses roughly 10 writes and a few
hundred reads a day. If a quota were ever hit, Spark simply pauses until the next day — it never bills.

## Guideline sources

- AAP / HealthyChildren — *Amount and Schedule of Formula Feedings* (≈2.5 oz per lb/day, usually ≤ 32 oz/day)
- KellyMom / HSE — breastfed babies 1–6 months average ~25 oz/day, typical 19–30 oz/day

These are population ranges, not prescriptions; the pediatrician's growth check is the real measure.
