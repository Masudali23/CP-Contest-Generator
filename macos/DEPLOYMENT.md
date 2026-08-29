# Deploying CP Contest Generator (macOS edition)

Everything below runs on **free tiers**. The application code is identical in
both editions, so the deployment is identical too — only the repository
sub-directory differs (`macos/backend` and `macos/frontend`).

**Reference stack**

| Piece | Service | Free tier |
|---|---|---|
| Database | **[Neon](https://neon.com)** — serverless PostgreSQL | 0.5 GB storage, no card |
| Cache | **[Upstash](https://upstash.com)** — serverless Redis | 10 000 commands/day, no card. *Optional* |
| API | **[Render](https://render.com)** — web service | 750 hours/month, sleeps after 15 min idle |
| Frontend | **[Vercel](https://vercel.com)** — static hosting | 100 GB bandwidth/month |
| AI | **[Google AI Studio](https://aistudio.google.com/apikey)** | Free Gemini tier. *Optional* |

Alternatives that work the same way are listed in
[Other free platforms](#other-free-platforms).

---

## Contents

- [Before you start](#before-you-start)
- [Step 1 — PostgreSQL on Neon](#step-1--postgresql-on-neon)
- [Step 2 — Redis on Upstash (optional)](#step-2--redis-on-upstash-optional)
- [Step 3 — API on Render](#step-3--api-on-render)
- [Step 4 — Frontend on Vercel](#step-4--frontend-on-vercel)
- [Step 5 — Close the loop](#step-5--close-the-loop)
- [Step 6 — Update Google OAuth](#step-6--update-google-oauth)
- [Verifying the deployment](#verifying-the-deployment)
- [Other free platforms](#other-free-platforms)
- [Keeping a free API awake](#keeping-a-free-api-awake)
- [Production checklist](#production-checklist)
- [Deployment troubleshooting](#deployment-troubleshooting)

---

## Before you start

Push the repository to GitHub — Render and Vercel both deploy from a repo.

```bash
git add .
git commit -m "Prepare for deployment"
git push -u origin main
```

There is a chicken-and-egg problem: the API needs the frontend's URL for CORS,
and the frontend needs the API's URL. Deploy the API first with a placeholder,
then come back and fix it in [Step 5](#step-5--close-the-loop).

---

## Step 1 — PostgreSQL on Neon

1. Sign up at [neon.com](https://neon.com) and create a project.
2. On the dashboard, copy the **connection string**. It looks like:

   ```
   postgresql://neondb_owner:PASSWORD@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. Keep it — it becomes `DATABASE_URL`, and you will also set
   `DATABASE_SSL=true`.

### Creating the schema

Run the schema against the hosted database once, passing the connection string
on the command line. Nothing in `backend/.env` is read or changed, so your local
setup keeps working:

```bash
cd macos/backend
```

Then run this, with your own connection string in the quotes:

```bash
DATABASE_URL='postgresql://neondb_owner:PASSWORD@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require' npm run db:init
```

You should see `Schema created / updated successfully.`

> **Keep the single quotes.** Neon passwords contain characters your shell would
> otherwise interpret. And do not paste the two lines above as one block — run
> the `cd` first, then the command.

> The inline variable wins over anything in `.env`, because `dotenv` never
> overwrites a variable that is already set. `DATABASE_SSL` is not needed here:
> the `sslmode=require` in Neon's own connection string already switches TLS on.

> `db:init` is idempotent, so you can also add it to the Render build command
> (`npm install && npm run db:init`) to keep the schema in sync on every deploy.

---

## Step 2 — Redis on Upstash (optional)

Skip this and the API uses its in-process cache — perfectly fine for a single
instance. Add Upstash if you run more than one instance or want the cache to
survive restarts.

1. Sign up at [upstash.com](https://upstash.com) and create a Redis database.
2. Pick the region closest to your Render region.
3. Copy the **`rediss://`** connection string (note the double *s* — it is TLS).
   That becomes `REDIS_URL`.

---

## Step 3 — API on Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Web Service** and pick your repository.
3. Configure:

   | Field | Value |
   |---|---|
   | **Name** | `cp-contest-api` |
   | **Region** | closest to you (match your Neon region) |
   | **Branch** | `main` |
   | **Root Directory** | `macos/backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

   > **Root Directory is the setting people miss.** It must be
   > `macos/backend` (forward slashes, no leading slash) so Render builds the
   > API rather than the repository root.

4. Add the environment variables under **Environment**:

   ```
   NODE_ENV=production
   DATABASE_URL=<your Neon connection string>
   DATABASE_SSL=true
   REDIS_URL=<your Upstash rediss:// string, or leave unset>
   JWT_SECRET=<a long random string>
   JWT_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=<from the Google Cloud Console>
   GOOGLE_CLIENT_SECRET=<from the Google Cloud Console>
   GOOGLE_REDIRECT_URI=https://cp-contest-api.onrender.com/auth/google/callback
   GEMINI_API_KEY=<from AI Studio, or leave unset>
   GEMINI_MODEL=gemini-2.5-flash
   FRONTEND_URL=https://PLACEHOLDER.vercel.app
   CORS_ORIGIN=https://PLACEHOLDER.vercel.app
   COOKIE_SAMESITE=none
   COOKIE_SECURE=true
   ```

   Generate the secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` are **required**: the frontend
   is on `vercel.app` and the API on `onrender.com`, so the session cookie is
   cross-site and browsers reject it under any other setting.

   Do **not** set `PORT` — Render injects its own.

5. **Create Web Service**. When the deploy finishes, note the URL, e.g.
   `https://cp-contest-api.onrender.com`, and check it:

   ```
   https://cp-contest-api.onrender.com/health
   → {"status":"ok","uptime":12,"cache":"redis","database":"ok"}
   ```

---

## Step 4 — Frontend on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** and import your repository.
3. Configure:

   | Field | Value |
   |---|---|
   | **Framework Preset** | Vite |
   | **Root Directory** | `macos/frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. Under **Environment Variables**, add:

   ```
   VITE_API_URL=https://cp-contest-api.onrender.com
   ```

   Vite inlines `VITE_*` variables at **build** time, so changing this later
   requires a redeploy, not just a restart.

5. **Deploy**, then note the URL, e.g. `https://cp-contest-generator.vercel.app`.

`frontend/vercel.json` already rewrites every path to `index.html`, so a hard
refresh on `/report/3` loads the app instead of a 404.

---

## Step 5 — Close the loop

Go back to Render → your service → **Environment** and replace the placeholders
with the real Vercel URL:

```
FRONTEND_URL=https://cp-contest-generator.vercel.app
CORS_ORIGIN=https://cp-contest-generator.vercel.app
```

Save. Render redeploys automatically.

> To allow Vercel preview deployments too, list several origins:
> `CORS_ORIGIN=https://cp-contest-generator.vercel.app,https://cp-contest-generator-git-dev-you.vercel.app`

---

## Step 6 — Update Google OAuth

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
open your OAuth client and add the production URLs **alongside** the localhost
ones (keep both so local development keeps working):

**Authorised JavaScript origins**

```
http://localhost:5173
https://cp-contest-generator.vercel.app
```

**Authorised redirect URIs**

```
http://localhost:8000/auth/google/callback
https://cp-contest-api.onrender.com/auth/google/callback
```

Save. Changes can take a few minutes to take effect.

If your consent screen is still in **Testing**, add every Google account that
should be able to sign in under **Audience → Test users**. To open it up, submit
the app for verification or switch it to **In production**.

---

## Verifying the deployment

```bash
# 1. The API is up and can reach the database
curl https://cp-contest-api.onrender.com/health

# 2. Public data works
curl https://cp-contest-api.onrender.com/user/topics

# 3. Protected routes reject anonymous callers
curl -i https://cp-contest-api.onrender.com/history          # expect 401

# 4. CORS reflects your frontend origin
curl -I -H "Origin: https://cp-contest-generator.vercel.app" \
     https://cp-contest-api.onrender.com/
# expect: access-control-allow-origin: https://cp-contest-generator.vercel.app
```

Then in a browser: open the Vercel URL, sign in with Google, link a handle,
generate a contest, end it and open the report.

---

## Other free platforms

Any of these substitute cleanly; only the setting names change.

### API

| Platform | Notes |
|---|---|
| **[Railway](https://railway.app)** | Trial credit then usage-based. Root directory `macos/backend`, start `npm start`. No cold starts |
| **[Fly.io](https://fly.io)** | Generous free allowance. Needs a `fly.toml`; run `fly launch` inside `macos/backend` and set `internal_port = 8000` |
| **[Koyeb](https://koyeb.com)** | One free service, no sleep. Build `npm install`, run `npm start` |
| **[Cyclic](https://cyclic.sh)** / **[Adaptable](https://adaptable.io)** | Simple Node hosting, similar setup |

### Frontend

| Platform | Notes |
|---|---|
| **[Netlify](https://netlify.com)** | `frontend/netlify.toml` and `public/_redirects` are already included. Base directory `macos/frontend` |
| **[Cloudflare Pages](https://pages.cloudflare.com)** | Build `npm run build`, output `dist`, root `macos/frontend`. Add a SPA fallback rule |
| **[Render Static Site](https://render.com)** | Add a rewrite: `/*` → `/index.html` (200) |
| **GitHub Pages** | Works, but needs `base` in `vite.config.js` and a 404 → index.html trick for client-side routing |

### Database

| Platform | Notes |
|---|---|
| **[Neon](https://neon.com)** | Recommended. Serverless, scales to zero, no card |
| **[Supabase](https://supabase.com)** | 500 MB free. Use the **connection pooling** string on serverless hosts |
| **[Render PostgreSQL](https://render.com)** | Free for 90 days, then expires |
| **[Aiven](https://aiven.io)** | Free PostgreSQL plan |

All of them need `DATABASE_SSL=true`.

### Cache

| Platform | Notes |
|---|---|
| **[Upstash](https://upstash.com)** | Recommended. Use the `rediss://` URL |
| *(none)* | Leave `REDIS_URL` unset — the API uses its in-process cache |

---

## Keeping a free API awake

Render's free tier sleeps after 15 minutes idle, so the first request afterwards
takes 30–60 seconds. The `/health` endpoint exists for uptime pingers:

- [UptimeRobot](https://uptimerobot.com) — free, 5-minute interval
- [Cron-job.org](https://cron-job.org) — free
- [BetterStack](https://betterstack.com) — free tier

Point one at `https://cp-contest-api.onrender.com/health` every 10 minutes.

> Pinging keeps the instance warm but still consumes free-tier hours. 750 hours a
> month is roughly one always-on service, which is enough for a single API.

---

## Production checklist

- [ ] `JWT_SECRET` is a long random value, different from the local one
- [ ] `NODE_ENV=production`
- [ ] `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` (frontend on a different domain)
- [ ] `DATABASE_SSL=true`
- [ ] `CORS_ORIGIN` lists your real frontend origin(s) and nothing else
- [ ] `FRONTEND_URL` matches the deployed frontend exactly, with no trailing slash
- [ ] `GOOGLE_REDIRECT_URI` matches the Cloud Console entry character for character
- [ ] `VITE_API_URL` points at the deployed API and the frontend was rebuilt after setting it
- [ ] The schema exists — `npm run db:init` ran against the production database
- [ ] `/health` returns `{"status":"ok"}`
- [ ] No `.env` file was committed (both are git-ignored)
- [ ] Google OAuth test users added, or the consent screen published

---

## Deployment troubleshooting

**`Missing required environment variables: ...` in the Render logs**
The service starts, validates its configuration and exits with a list of what is
missing. Add those variables and redeploy.

**`PostgreSQL connection error: self signed certificate in certificate chain`**
Set `DATABASE_SSL=true`.

**`Origin https://... is not allowed by CORS` (403)**
`CORS_ORIGIN` does not contain that exact origin. Scheme and host must match, with
no trailing slash and no path.

**Sign-in redirects back to the login page in production**
The cross-site session cookie is being dropped. Confirm all four:
`COOKIE_SAMESITE=none`, `COOKIE_SECURE=true`, the API is served over HTTPS, and
`CORS_ORIGIN` contains the frontend origin. Safari and Brave are strict here —
test in Chrome first to isolate the cause.

**`Error 400: redirect_uri_mismatch` in production**
`GOOGLE_REDIRECT_URI` must equal the **API's** callback URL
(`https://your-api.onrender.com/auth/google/callback`), not the frontend's, and
must be listed in the Cloud Console.

**A hard refresh on `/report/3` returns 404**
The SPA fallback is missing. `vercel.json`, `netlify.toml` and `public/_redirects`
are all included — make sure the host's **Root Directory** is
`macos/frontend` so it picks them up.

**The frontend still calls `http://localhost:8000`**
`VITE_API_URL` was added after the build. Redeploy the frontend — Vite inlines it
at build time.

**`relation "users" does not exist`**
The schema was never created against the production database. Run
`npm run db:init` with `DATABASE_URL` pointing at it, or add it to the build
command.

**The first request after a while takes a minute**
Render free-tier cold start. See [Keeping a free API awake](#keeping-a-free-api-awake).

**The report banner says the AI narrative was unavailable**
`GEMINI_API_KEY` is unset, invalid or over its quota. The report is still complete
— only the prose comes from the offline analyser. The exact error is shown in the
banner.
