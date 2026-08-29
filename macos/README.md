# CP Contest Generator — macOS Edition

Built for macOS on **Apple silicon (M1–M4) and Intel**. Setup is Homebrew-based;
the shell scripts target the bash 3.2 and BSD userland that ship with macOS, so
they run on a stock system with nothing extra installed.

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
| **macOS** | 12 Monterey or newer | — |
| **Homebrew** | latest | see below |
| **Node.js** | **20.19+ or 22.12+** (not 21.x — see below) | `brew install node@22` |
| **PostgreSQL** | 14 or newer | `brew install postgresql@16` |
| **Redis** | optional | `brew install redis` |
| **Git** | any | `brew install git` (or Xcode Command Line Tools) |

### Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

On Apple silicon, Homebrew installs to `/opt/homebrew` and prints a **Next steps**
block. Run it, or your shell will not find `brew`:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

On Intel Macs the prefix is `/usr/local` and it is usually already on `PATH`.

### Node and PostgreSQL

```bash
brew install node postgresql@16
brew services start postgresql@16
```

`postgresql@16` is keg-only, so add its binaries to your `PATH`:

```bash
# Apple silicon
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc

# Intel
echo 'export PATH="/usr/local/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc

exec $SHELL -l
```

Verify and create the database:

```bash
node --version         # must be 20.19+ or 22.12+, NOT 21.x
psql --version
createdb cp_contest
```

> **Node 21 does not work.** Vite 8 and ESLint 10 declare
> `^20.19.0 || >=22.12.0`, which excludes the whole 21.x line. The backend runs
> fine on 21, so `npm run db:init` and `npm start` will succeed — but `npm run
> dev` and `npm run build` crash inside Vite's bundler. If `node --version`
> reports 21.x:
>
> ```bash
> brew install node@22
> brew link --overwrite --force node@22
> ```
>
> or, if you use nvm: `nvm install 22 && nvm use 22`. `npm run setup` checks this
> and refuses to continue on an unsupported version.

Homebrew's PostgreSQL creates a superuser named after your macOS account and
trusts local connections, so no password is needed:

```
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/cp_contest
```

`npm run setup` fills that in for you.

> Prefer not to install PostgreSQL? Create a free database at
> [neon.com](https://neon.com), paste its connection string into `DATABASE_URL`
> and set `DATABASE_SSL=true`.

---

## Quick start

```bash
git clone https://github.com/Masudali23/CP-Contest-Generator.git
cd CP-Contest-Generator/macos

npm run setup
```

`setup.sh` will:

- verify Homebrew, Node.js 20+ and npm,
- report whether PostgreSQL and Redis are running,
- run `npm install` in `backend/` and `frontend/`,
- create `backend/.env` and `frontend/.env` from their `.env.example` files,
- generate a cryptographically random `JWT_SECRET`,
- point `DATABASE_URL` at your local PostgreSQL,
- create the `cp_contest` database and the schema.

Then add your keys:

```bash
open -e backend/.env      # or: nano backend/.env
```

Check and start:

```bash
npm run doctor
npm run dev
```

Open <http://localhost:5173>.

---

## Manual setup

```bash
cd CP-Contest-Generator/macos

# 1. Dependencies
(cd backend  && npm install)
(cd frontend && npm install)

# 2. Environment files
cp backend/.env.example  backend/.env
cp frontend/.env.example frontend/.env

# 3. A random JWT secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# paste the output into JWT_SECRET in backend/.env

# 4. Point DATABASE_URL at your database, add the Google credentials
nano backend/.env

# 5. Create the tables
(cd backend && npm run db:init)
```


### Creating the database schema

`npm run setup` does this for you against your local database. Run it by hand
when you change databases — pointing at a hosted one, or recreating a dropped
local one.

Run it from `macos/backend`, with dependencies already installed:

```bash
cd macos/backend
npm install
```

Against the database in `backend/.env`:

```bash
npm run db:init
```

Against a *different* database — a hosted one, say — without touching `.env`,
put the connection string on the command line:

```bash
DATABASE_URL='postgresql://user:password@host.example.com/dbname?sslmode=require' npm run db:init
```

The inline value wins because `dotenv` never overwrites a variable that is
already set, so your local configuration is left exactly as it was. Keep the
single quotes: passwords routinely contain characters the shell would otherwise
interpret.

`db:init` is idempotent — it creates missing tables, adds missing columns and
creates missing indexes, so it is also the upgrade path for an existing
database.

> **You will see an SSL warning, and it is harmless.** With a Neon or Supabase
> URL, `pg` prints:
>
> ```
> Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca'
> are treated as aliases for 'verify-full'.
> ```
>
> It is telling you that `sslmode=require` currently gives you the *strongest*
> behaviour (full certificate verification), and that a future `pg` v9 will make
> it weaker to match libpq. Nothing is wrong, and the schema still applies. To
> silence it, change `sslmode=require` to `sslmode=verify-full` in the URL you
> pass — same behaviour today, and future-proof.
>
> Success is one line:
>
> ```
> Schema created / updated successfully.
> ```

> **`Cannot find package 'dotenv'`** means you skipped `npm install`. `git pull`
> does not install dependencies.
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
5. Copy the **Client ID** and **Client secret** into `backend/.env`.

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

### `backend/.env`

| Variable | Required | Default | Notes |
|---|:---:|---|---|
| `NODE_ENV` | | `development` | `production` on a deployed server |
| `PORT` | | `8000` | API port |
| `DATABASE_URL` | ✅ | — | `postgresql://YOUR_USER@localhost:5432/cp_contest` |
| `DATABASE_SSL` | | `false` | `true` for Neon, Supabase, Render |
| `REDIS_URL` | | *(empty)* | Empty = in-memory cache. See [Caching options](#caching-options) |
| `JWT_SECRET` | ✅ | — | Long random string; generated by `setup.sh` |
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

### `frontend/.env`

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the API. Baked in at **build** time — rebuild after changing it |

---

## Running the app

```bash
npm run dev
```

Starts both servers in one terminal and stops both on **Ctrl+C** — including the
`node` processes underneath `npm`, so nothing is left holding port 8000 or 5173.

| Command | What it does |
|---|---|
| `npm run dev` | API + frontend together |
| `bash scripts/dev.sh --backend-only` | API only |
| `bash scripts/dev.sh --frontend-only` | Frontend only |
| `npm run doctor` | Full diagnostic: toolchain, services, ports, database, cache |
| `npm run services:start` | `brew services start` for PostgreSQL and Redis |
| `npm run services:stop` | Stops them again |
| `npm run db:init` | Create or upgrade the schema (safe to re-run) |
| `npm run build` | Production build of the frontend into `frontend/dist` |
| `npm run lint` | ESLint over the frontend |

To run them in separate terminals instead:

```bash
# Terminal 1
cd macos/backend  && npm run dev

# Terminal 2
cd macos/frontend && npm run dev
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
responses are cached.

### 1. In-memory (default, zero setup)

Leave `REDIS_URL` empty. Cached inside the Node process with real TTL expiry.
Cleared on restart, not shared between instances — ideal for local development
and fine for a single deployed instance.

### 2. Local Redis via Homebrew

```bash
brew install redis
brew services start redis
```

Then set `REDIS_URL=redis://localhost:6379` in `backend/.env`.

### 3. Upstash (free, hosted)

Create a database at [upstash.com](https://upstash.com) and paste the
**`rediss://`** connection string into `REDIS_URL`. This is what a deployed
instance should use.

If the configured Redis is unreachable the API logs a warning and falls back to
the in-memory cache rather than refusing to start.

---

## Project structure

```
macos/
├── package.json                 Top-level scripts (setup / dev / doctor / services)
├── scripts/
│   ├── setup.sh                 One-shot setup
│   ├── dev.sh                   Runs both servers, Ctrl+C stops both
│   ├── doctor.sh                Diagnostics
│   └── services.sh              brew services helper
│
├── backend/
│   ├── scripts/
│   │   ├── initdb.js            Creates/upgrades the schema
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

**`Cannot find package 'dotenv'` (or any other package)**
Dependencies are not installed yet. Run `npm install` in the folder you are in
(`macos/backend` or `macos/frontend`), or `npm run setup` from `macos/` to do both.

**Vite crashes with `ERR_INVALID_ARG_VALUE` or `Cannot find native binding`**
You are on Node 21.x, which Vite 8 does not support. Check with `node --version`
and switch to 20.19+ or 22.12+:

```bash
brew install node@22
brew link --overwrite --force node@22
```

**`brew: command not found`**
Homebrew is installed but not on `PATH`. On Apple silicon:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
```

**`psql: command not found`**
`postgresql@16` is keg-only. Add it to `PATH` (see
[Prerequisites](#prerequisites)) or use the versioned path directly:
`/opt/homebrew/opt/postgresql@16/bin/psql`.

**`could not connect to server: No such file or directory`**
PostgreSQL is not running:

```bash
npm run services:start
# or
brew services start postgresql@16
brew services list
```

**`database "cp_contest" does not exist`**

```bash
createdb cp_contest
npm run db:init
```

**`role "postgres" does not exist`**
Homebrew's PostgreSQL does not create a `postgres` superuser. Use your macOS
username instead:

```
DATABASE_URL=postgresql://$(whoami)@localhost:5432/cp_contest
```

**`Error 400: redirect_uri_mismatch`**
`GOOGLE_REDIRECT_URI` and the URI in the Google Cloud Console must be identical.
Compare them character by character, including port and trailing slash.

**Sign-in works but every page bounces back to the login screen**
The session cookie is not reaching the API. Check that `CORS_ORIGIN` contains
exactly `http://localhost:5173` and that the frontend really is on port 5173 —
`vite.config.js` sets `strictPort`, so Vite fails loudly instead of silently
moving to 5174.

**`Port 8000 is already in use`**

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
```

Then kill the PID that command prints:

```bash
kill -9 PID
```

Or change `PORT` in `backend/.env` (and `VITE_API_URL` in `frontend/.env` to match).

**Port 5000 or 7000 is taken by "AirTunes"**
macOS AirPlay Receiver claims those ports. This project uses 8000 and 5173, so it
is unaffected — but do not move `PORT` to 5000.

**"No unsolved problems matched those filters"**
Your topic and difficulty combination has no unsolved problems left. Pick fewer
topics or a different difficulty.

**The report says the AI narrative was unavailable**
`GEMINI_API_KEY` is missing, invalid or rate-limited. The report is complete
either way — only the prose comes from the offline analyser. The exact error is
shown in the banner at the top of the report.

**Anything else** — run `npm run doctor`. It checks the toolchain, Homebrew
services, ports, `.env` files, the database connection and the cache backend.

---

## Deploying

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a complete free-tier walkthrough
(Vercel + Render + Neon + Upstash), with alternatives and a production checklist.
