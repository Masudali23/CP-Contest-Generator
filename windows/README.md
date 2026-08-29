# CP Contest Generator — Windows Edition

Runs **natively on Windows 10/11**. No WSL, no Docker Desktop, no Linux
subsystem of any kind. Everything is PowerShell, Node.js and a native Windows
PostgreSQL install.

> Redis has no supported native Windows build, so this edition treats it as
> optional. Leave `REDIS_URL` empty and the API uses a built-in in-process cache
> with real TTL expiry. See [Caching options](#caching-options) if you want a
> shared cache later.

---

## Contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Manual setup](#manual-setup)
- [Getting your API keys](#getting-your-api-keys)
- [Environment variables](#environment-variables)
- [Running the app](#running-the-app)
- [Caching options](#caching-options)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Deploying](#deploying)

---

## Prerequisites

| Requirement | Version | Install |
|---|---|---|
| **Windows** | 10 or 11 | — |
| **PowerShell** | 5.1 (built in) or 7+ | Built in. `winget install Microsoft.PowerShell` for 7 |
| **Node.js** | 20 LTS or newer | `winget install OpenJS.NodeJS.LTS` |
| **PostgreSQL** | 14 or newer | `winget install PostgreSQL.PostgreSQL.17` |
| **Git** | any | `winget install Git.Git` |

Open PowerShell and verify:

```powershell
node --version    # v20.x or newer
npm --version
```

> **After any `winget install`, open a new terminal** so the updated `PATH` is
> picked up.

### Installing PostgreSQL

The EnterpriseDB installer that `winget` fetches is a normal Windows service —
no containers involved.

```powershell
winget install PostgreSQL.PostgreSQL.17
```

During the installer:

1. Set a password for the `postgres` superuser and **write it down** — it goes
   into `DATABASE_URL`.
2. Keep the default port **5432**.
3. Let it install pgAdmin if you want a GUI (optional).

Add the PostgreSQL tools to your `PATH` so `psql` and `createdb` work
(optional — the schema is created by Node, not `psql`):

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\17\bin"

# Make it permanent for your user:
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\PostgreSQL\17\bin",
  "User"
)
```

Create the database:

```powershell
# Using psql (you will be prompted for the postgres password)
psql -U postgres -c "CREATE DATABASE cp_contest;"
```

Or with pgAdmin: right-click **Databases → Create → Database**, name it
`cp_contest`.

> Prefer not to install PostgreSQL at all? Create a free database at
> [neon.com](https://neon.com), copy its connection string into `DATABASE_URL`
> and set `DATABASE_SSL=true`. Everything else works the same.

---

## Quick start

```powershell
git clone https://github.com/Masudali23/CP-Contest-Generator.git
cd CP-Contest-Generator\windows

npm run setup
```

`setup.ps1` will:

- verify Node.js 20+ and npm,
- run `npm install` in `backend\` and `frontend\`,
- create `backend\.env` and `frontend\.env` from their `.env.example` files,
- generate a cryptographically random `JWT_SECRET`,
- create the database schema if `DATABASE_URL` is already valid.

Then fill in your keys:

```powershell
notepad backend\.env
```

Create the schema (if setup skipped it), check everything, and start:

```powershell
npm run db:init
npm run doctor
npm run dev
```

Open <http://localhost:5173>.

> **"cannot be loaded because running scripts is disabled on this system"**
> The npm scripts already pass `-ExecutionPolicy Bypass`, so `npm run setup`
> works regardless. To run a `.ps1` file directly, either use the `.cmd` shim
> (`scripts\setup.cmd`) or allow local scripts once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## Manual setup

If you would rather not run the setup script:

```powershell
cd CP-Contest-Generator\windows

# 1. Dependencies
cd backend  ; npm install ; cd ..
cd frontend ; npm install ; cd ..

# 2. Environment files
Copy-Item backend\.env.example  backend\.env
Copy-Item frontend\.env.example frontend\.env

# 3. A random JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# paste the output into JWT_SECRET in backend\.env

# 4. Edit backend\.env with your database URL and Google credentials
notepad backend\.env

# 5. Create the tables
cd backend ; npm run db:init ; cd ..
```

---

## Getting your API keys

### Google OAuth (required — this is how you sign in)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in the app name and your email
   - Under **Audience → Test users**, add the Google account you will sign in with
     (an app in *Testing* status only admits listed test users)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins:** `http://localhost:5173`
   - **Authorised redirect URIs:** `http://localhost:8000/auth/google/callback`
5. Copy the **Client ID** and **Client secret** into `backend\.env`.

> The redirect URI must match `GOOGLE_REDIRECT_URI` **character for character**,
> including the scheme, port and the absence of a trailing slash. A mismatch
> gives `Error 400: redirect_uri_mismatch`.

### Gemini API key (optional)

1. Open [Google AI Studio](https://aistudio.google.com/apikey).
2. **Create API key**, copy it into `GEMINI_API_KEY`.

Without a key the report still generates in full — the offline analyser writes
the prose instead of Gemini, and the page shows a note saying so. Every statistic,
topic breakdown and practice recommendation is computed locally either way.

### Codeforces

No key needed. The public API is used anonymously.

---

## Environment variables

### `backend\.env`

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `NODE_ENV` | | `development` | `production` on a deployed server |
| `PORT` | | `8000` | API port |
| `DATABASE_URL` | ✅ | — | `postgresql://postgres:PASSWORD@localhost:5432/cp_contest` |
| `DATABASE_SSL` | | `false` | `true` for Neon, Supabase, Render |
| `REDIS_URL` | | *(empty)* | Empty = in-memory cache. See [Caching options](#caching-options) |
| `JWT_SECRET` | ✅ | — | Long random string; generated by `setup.ps1` |
| `JWT_EXPIRES_IN` | | `7d` | Session lifetime |
| `GOOGLE_CLIENT_ID` | ✅ | — | From the Cloud Console |
| `GOOGLE_CLIENT_SECRET` | ✅ | — | From the Cloud Console |
| `GOOGLE_REDIRECT_URI` | ✅ | — | `http://localhost:8000/auth/google/callback` |
| `GEMINI_API_KEY` | | *(empty)* | Optional; offline analyser used when absent |
| `GEMINI_MODEL` | | `gemini-2.5-flash` | Any model your key can reach |
| `FRONTEND_URL` | | `http://localhost:5173` | Where OAuth redirects back to |
| `CORS_ORIGIN` | | `http://localhost:5173` | Comma-separated list of allowed browser origins |
| `COOKIE_SAMESITE` | | auto | `none` when the frontend is on a different domain |
| `COOKIE_SECURE` | | auto | `true` in production |
| `CF_API_BASE` | | Codeforces API | Only change to use a mirror or proxy |

### `frontend\.env`

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the API. Baked in at **build** time — rebuild after changing it |

---

## Running the app

```powershell
npm run dev
```

Starts both servers in one terminal and stops both on **Ctrl+C**.

| Command | What it does |
|---|---|
| `npm run dev` | API + frontend together |
| `powershell -File scripts\dev.ps1 -BackendOnly` | API only |
| `powershell -File scripts\dev.ps1 -FrontendOnly` | Frontend only |
| `npm run doctor` | Full diagnostic: toolchain, ports, services, database, cache |
| `npm run db:init` | Create or upgrade the schema (safe to re-run) |
| `npm run build` | Production build of the frontend into `frontend\dist` |
| `npm run lint` | ESLint over the frontend |

To run them in separate terminals instead:

```powershell
# Terminal 1
cd windows\backend  ; npm run dev

# Terminal 2
cd windows\frontend ; npm run dev
```

### Using the app

1. Open <http://localhost:5173> and **Continue with Google**.
2. Enter your Codeforces handle. It is verified against the Codeforces API.
3. **Generate contest** — choose topics, difficulty and duration.
4. Solve the problems on Codeforces. The contest page refreshes progress every
   minute; **Check progress** forces an immediate refresh.
5. **End contest**, or let the timer run out, then open the report.

> Codeforces caches submission data for a few minutes, so a solve can take a
> moment to show up. That is upstream, not a bug in the app.

---

## Caching options

The Codeforces problemset is ~7 MB of JSON and its rate limits are strict, so
responses are cached. Three options, in order of how much setup they need:

### 1. In-memory (default, zero setup)

Leave `REDIS_URL` empty. Cached inside the Node process with real TTL expiry.
Cleared on restart, not shared between instances — ideal for local development
and fine for a single deployed instance.

### 2. Upstash (free, works everywhere)

A hosted Redis with a free tier and no local install.

1. Create a database at [upstash.com](https://upstash.com).
2. Copy the **`rediss://`** connection string into `REDIS_URL`.

### 3. Memurai (native Windows Redis, no WSL)

[Memurai](https://www.memurai.com/) is a Redis-compatible Windows service. The
Developer edition is free.

```powershell
winget install Memurai.MemuraiDeveloper
# then in backend\.env:
#   REDIS_URL=redis://localhost:6379
```

If the configured Redis is unreachable the API logs a warning and falls back to
the in-memory cache rather than refusing to start.

---

## Project structure

```
windows/
├── package.json                 Top-level scripts (setup / dev / doctor)
├── scripts/
│   ├── setup.ps1  setup.cmd     One-shot setup
│   ├── dev.ps1    dev.cmd       Runs both servers, Ctrl+C stops both
│   └── doctor.ps1 doctor.cmd    Diagnostics
│
├── backend/
│   ├── scripts/
│   │   ├── initdb.js            Creates/upgrades the schema (no psql needed)
│   │   └── checkenv.js          Backend self-check
│   └── src/
│       ├── index.js             Entry point, startup and graceful shutdown
│       ├── app.js               Express app, CORS, /health, error handling
│       ├── config/
│       │   ├── env.js           Loads and validates .env
│       │   ├── db.js            PostgreSQL pool
│       │   ├── cache.js         Redis-or-memory cache
│       │   ├── google.js        Per-request OAuth client
│       │   └── init.sql         Idempotent schema
│       ├── controllers/         auth, user, contest
│       ├── routes/              auth, user, contest
│       ├── middleware/          auth guard, error handler
│       ├── model/ · db/         Data access
│       ├── services/
│       │   ├── codeforces.service.js         CF API + caching + retries
│       │   ├── contestAnalytics.service.js   Statistics from submissions
│       │   ├── recommendation.service.js     Practice ladders per weak topic
│       │   ├── geminiService.js              JSON-mode model calls
│       │   └── report.service.js             Report assembly + offline analyser
│       ├── prompts/             Report prompt
│       └── utils/               Topic metadata, async helpers
│
└── frontend/
    └── src/
        ├── api/client.js        Single axios instance (VITE_API_URL)
        ├── hooks/               useApiResource, useAuth
        ├── components/          Route guard, spinner, error state, report widgets
        └── pages/               Home, Setup, Landing, Dashboard, Contest,
                                 History, Reports, Report, NotFound
```

### Database schema

| Table | Purpose |
|---|---|
| `users` | Google identity, Codeforces handle, rating, max rating, rank |
| `contests` | Duration, difficulty, requested tags, rating at start, end state |
| `contest_problems` | One row per problem: Codeforces ids, rating, **tags**, position |
| `contest_reports` | One JSONB report per contest (upserted on regeneration) |

`npm run db:init` is idempotent — it creates missing tables, adds missing columns
and creates missing indexes, so it safely upgrades an existing database.

---

## API reference

All routes except `/`, `/health`, `/user/topics` and the OAuth endpoints need a
`token` cookie (a `Authorization: Bearer <jwt>` header also works).

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service banner |
| `GET` | `/health` | Uptime, cache backend and database status |
| `GET` | `/auth/google` | Starts Google sign-in |
| `GET` | `/auth/google/callback` | OAuth callback, sets the cookie |
| `GET` | `/auth/me` | The signed-in user |
| `POST` | `/auth/logout` | Clears the cookie |
| `GET` | `/user/topics` | Codeforces tags with display labels |
| `POST` | `/user/setup` | Links and verifies a Codeforces handle |
| `POST` | `/generate-contest` | `{ tags, difficulty, duration }` → `{ contestId }` |
| `POST` | `/generate-test-contest` | Six-problem 800–1000 warm-up |
| `GET` | `/history` | Contests with problem counts and report availability |
| `GET` | `/contest/:id` | Problems and live status. `?refresh=true` bypasses the cache |
| `PATCH` | `/contest/:id/end` | Ends the contest |
| `GET` | `/contest/:id/report` | Stored report, `404` if not generated yet |
| `POST` | `/contest/:id/report` | Generates it. `?refresh=true` regenerates |

---

## Troubleshooting

**`npm run setup` says scripts are disabled**
The npm scripts pass `-ExecutionPolicy Bypass`, so this only affects running
`.ps1` files directly. Use `scripts\setup.cmd`, or run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

**`'node' is not recognized`**
Node was installed but this terminal has the old `PATH`. Open a new PowerShell
window.

**`PostgreSQL connection error: password authentication failed`**
The password in `DATABASE_URL` does not match the one set during installation.
Reset it:

```powershell
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'newpassword';"
```

If the password contains `@`, `:`, `/` or `#`, URL-encode it (`@` → `%40`).

**`PostgreSQL connection error: ECONNREFUSED`**
The service is not running:

```powershell
Get-Service postgresql*
Start-Service postgresql-x64-17
```

**`Error 400: redirect_uri_mismatch`**
`GOOGLE_REDIRECT_URI` and the URI in the Google Cloud Console must be identical.
Compare them character by character, including port and trailing slash.

**Sign-in works but every page bounces back to the login screen**
The session cookie is not reaching the API. Check that `CORS_ORIGIN` contains
exactly `http://localhost:5173` and that the frontend really is on port 5173 —
`vite.config.js` sets `strictPort`, so Vite fails loudly instead of silently
moving to 5174.

**`Origin http://localhost:5174 is not allowed by CORS`**
Something else is on 5173. Free it, or add the other origin to `CORS_ORIGIN`.

**`Port 8000 is already in use`**

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen |
  Select-Object OwningProcess |
  ForEach-Object { Get-Process -Id $_.OwningProcess }
```

Then stop the process it lists:

```powershell
Stop-Process -Id PID
```

Or change `PORT` in `backend\.env` (and `VITE_API_URL` in `frontend\.env` to match).

**"No unsolved problems matched those filters"**
Your topic and difficulty combination has no unsolved problems left. Pick fewer
topics or a different difficulty.

**The report says the AI narrative was unavailable**
`GEMINI_API_KEY` is missing, invalid or rate-limited. The report is complete
either way — only the prose comes from the offline analyser. The exact error is
shown in the banner at the top of the report.

**Anything else** — run `npm run doctor`. It checks the toolchain, ports,
services, `.env` files, the database connection and the cache backend.

---

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a complete free-tier walkthrough
(Vercel + Render + Neon + Upstash), with alternatives and a production checklist.
