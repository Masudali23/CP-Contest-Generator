# Corrections to the original code

Every defect found while reviewing the original project, what it broke, and how
it was fixed. Grouped by severity.

Both editions contain the same fixes — `windows/` and `macos/` differ only in
their setup scripts and documentation.

---

## Contents

- [Bugs that broke features outright](#bugs-that-broke-features-outright)
- [Data-correctness bugs](#data-correctness-bugs)
- [Reliability and deployment bugs](#reliability-and-deployment-bugs)
- [Security and auth issues](#security-and-auth-issues)
- [Frontend bugs](#frontend-bugs)
- [Cleanups](#cleanups)
- [What the report gained](#what-the-report-gained)

---

## Bugs that broke features outright

### 1. The dashboard ignored every setting you chose

`Dashboard.jsx` collected topics, difficulty and duration, then posted them to
the **wrong endpoint**. `/generate-test-contest` ignores its body entirely and
always produces a fixed 800–1000 warm-up, so the topic picker, the difficulty
picker and the duration picker had no effect at all.

```js
// before - frontend/src/pages/Dashboard.jsx
const payload = { tags: selectedTopics, difficulty, duration };
const response = await axios.post(
  "http://localhost:8000/generate-test-contest",   // ignores payload
  payload, { withCredentials: true }
);
```

```js
// after
const { data } = await api.post("/generate-contest", {
    tags: selectedTopics,
    difficulty,
    duration: Number(duration),
});
```

The warm-up generator is still reachable, now as its own clearly-labelled button.

---

### 2. `ReferenceError` in every cache-fallback handler

Four copies of the cache block caught the error as `error` but logged `err`.
`err` is not defined, so the *fallback path itself* threw, and the outer `catch`
turned it into a 500. Any Redis hiccup — or simply not having Redis — broke
contest generation, progress and reports.

```js
// before - backend/src/controllers/contest.js (x4)
} catch (error) {
  console.error("Redis error:", err.message);   // ReferenceError: err is not defined
  const problemsRes = await axios.get("https://codeforces.com/api/problemset.problems");
  problems = problemsRes.data.result.problems;
}
```

All four copies were replaced by one helper in
`services/codeforces.service.js`, and the cache layer now swallows its own errors
instead of letting them escape.

---

### 3. The cache TTL never applied

`redisClient.set(key, value, "EX", ttl)` is the **ioredis** signature. The project
uses **node-redis v5**, whose third argument is an options object. The extra
arguments were ignored, so the Codeforces problemset — a ~7 MB payload with a
nominal 24-hour TTL — was cached **forever**, and the 3-minute user-status cache
never expired either. Contest progress could go stale indefinitely.

```js
// before
await redisClient.set(PROBLEMSET_CACHE_KEY, JSON.stringify(problems), "EX", PROBLEMSET_CACHE_TTL);

// after - backend/src/config/cache.js
await client.set(key, value, { EX: ttlSeconds });
```

Verified: `cache.set(key, value, 1)` followed by a 1.1 s wait now returns `null`.

---

### 4. Problem tags were never stored

`contest_problems` had no `tags` column, and the insert dropped
`problem.tags` on the floor. Since the topic of each problem was never persisted,
**no topic-level analysis was possible** — the report could only ever count
solved/unsolved.

```sql
-- after - backend/src/config/init.sql
ALTER TABLE contest_problems ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
```

This single change is what makes the whole topic breakdown, the weak-topic
diagnosis and the practice recommendations possible.

---

### 5. Re-running `init.sql` failed

Three tables used `CREATE TABLE IF NOT EXISTS`; the fourth did not.

```sql
-- before
CREATE TABLE contest_reports ( ... );

-- after
CREATE TABLE IF NOT EXISTS contest_reports ( ... );
```

The whole schema is now idempotent — `npm run db:init` creates missing tables,
adds missing columns and creates missing indexes, so it doubles as the migration
for an existing database. Verified against a real v1 database: the new columns
were added and the existing rows survived.

---

### 6. Regenerating a report always failed

`contest_reports.contest_id` is `UNIQUE`, and the insert was a plain `INSERT`.
The second attempt at a report for the same contest threw a constraint violation.

```sql
-- after - backend/src/db/contest.db.js
INSERT INTO contest_reports(contest_id, report)
VALUES($1, $2)
ON CONFLICT (contest_id) DO UPDATE
    SET report = EXCLUDED.report, generated_at = CURRENT_TIMESTAMP
RETURNING *;
```

There is now a **Regenerate** button on the report page.

---

### 7. The AI response could not be parsed

The service asked for JSON in the prompt but received free-form text, then
`JSON.parse`d it directly. Models routinely wrap JSON in a ` ```json ` fence, and
every such response produced `500 Invalid AI response`.

The model id was also wrong: `gemini-3.1-flash-lite` does not exist.

```js
// before - backend/src/services/geminiService.js
model: "gemini-3.1-flash-lite",
contents: prompt,
// ... caller then did JSON.parse(rawReport)
```

```js
// after
const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,                      // default gemini-2.5-flash, configurable
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 8192 },
});
return extractJson(response.text);                // strips fences as a safety net
```

Plus retries with backoff, and an **offline analyser** that writes the same report
shape when the key is missing or the call fails — so a report always renders.

---

## Data-correctness bugs

### 8. Contest progress counted your entire submission history

Progress and the report scanned **every submission the account had ever made**,
with no time filter. A problem you had attempted and failed months earlier was
reported as "wrong" the instant the contest started, and those phantom failures
fed straight into the report's accuracy figures.

```js
// before - backend/src/controllers/contest.js
for (const sub of submissions) {
    const key = `${sub.problem.contestId}-${sub.problem.index}`;
    attempted.add(key);                       // no time filter at all
    if (sub.verdict === "OK") solved.add(key);
}
```

```js
// after - backend/src/controllers/contest.controller.js
for (const submission of submissions) {
    if (!submission.problem?.contestId) continue;
    // Only count submissions made after the contest started.
    if (submission.creationTimeSeconds * 1000 < startMs) continue;
    ...
}
```

The analytics service goes further and bounds submissions to
`[contest start, min(ended_at, scheduled end)]`, which also lets it detect
**upsolves** — correct submissions made after the window closed.

Verified in the integration test: a pre-contest wrong answer is excluded, giving
6 in-window submissions instead of 7.

---

### 9. A contest could contain the same problem twice

`generateTestContest` guarded against duplicates with a `used` set.
`generateContest` — the main generator — did not. Whenever two rating targets
landed in the same band, the same problem could be selected twice and inserted
twice.

```js
// after - backend/src/controllers/contest.controller.js
const chosen = new Set();
for (const target of targetRatings) {
    const candidates = problemset.filter((problem) => {
        const key = problemKey(problem.contestId, problem.index);
        if (solved.has(key) || chosen.has(key)) return false;
        ...
    });
    ...
    chosen.add(problemKey(pick.contestId, pick.index));
}
```

Backed by a database constraint:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_contest_problems_unique
    ON contest_problems(contest_id, contest_id_cf, problem_index);
```

---

### 10. Rating targets fell outside the range Codeforces uses

For a 1000-rated user on "easy", the ladder was
`[700, 800, 900, 1000]`. Codeforces has no problems below 800, so the first rung
always matched nothing and the contest silently came back a problem short.
Nothing capped the top end at 3500 either.

```js
// after
const clampRating = (rating) => Math.max(800, Math.min(3500, Math.round(rating / 100) * 100));
```

There is also a fallback: if a narrow tag selection leaves the ladder mostly
empty, the search widens its rating tolerance before giving up, and a genuinely
empty result returns a clear `422` instead of an empty contest.

---

### 11. Unrated users had their stored rating wiped

The guard compared against `userRating` (which falls back to 1000) but wrote
`user.rating`, which is `undefined` for unrated accounts — writing `NULL` over
whatever was stored.

```js
// before
let userRating = user.rating || 1000;
if (dbUser.rating !== userRating) {
    await updateUserRating({ id: dbUser.id, rating: user.rating });   // undefined
}
```

```js
// after
if (profile.rating && profile.rating !== dbUser.rating) {
    await updateUserRating({
        id: dbUser.id, rating: profile.rating, maxRating: profile.maxRating, rank: profile.rank,
    });
}
```

---

### 12. Unrated problems were rejected by the schema

`contest_problems.rating` was `NOT NULL`, but Codeforces returns problems without
a rating. Selecting one aborted the insert.

```sql
ALTER TABLE contest_problems ALTER COLUMN rating DROP NOT NULL;
```

---

### 13. A partially-inserted contest on failure

Problems were inserted one at a time in an `await` loop, so a failure halfway
through left a contest with some of its problems.

```js
// before
for (let i = 0; i < selectedProblems.length; i++) {
    await createContestProblems({ ... });          // one round trip per problem
}
```

Now a single multi-row `INSERT ... ON CONFLICT DO NOTHING`.

---

## Reliability and deployment bugs

### 14. `.env` was loaded after the modules that read it

ES module imports are hoisted and evaluated **before** any statement in the
module body. `dotenv.config()` sat halfway down `index.js`, below
`import connectDB from './config/index.js'` — which constructs the PostgreSQL
pool at import time. The pool was built before its own configuration existed.
It happened to work only because of a second `import 'dotenv/config'`, and only
when the process was started from `backend/`.

```js
// before - backend/src/index.js
import dotenv from 'dotenv'
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/index.js';   // pool constructed here, at import time
dotenv.config({ path: "./.env" });           // ...but configured here
```

```js
// after - backend/src/config/env.js
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(path.resolve(here, "..", ".."), ".env"), quiet: true });
```

`env.js` is imported first everywhere, and resolves the path from the file's own
location rather than the working directory — so `npm start` works from any
directory on either platform. It also validates required variables and exits with
a readable list of what is missing.

---

### 15. Losing Redis took down the whole API

```js
// before - backend/src/config/redis.js
catch (error) {
    console.log("Redis connection error:", error);
    process.exit(1);                          // kills the API
}
```

Every cache read already had an HTTP fallback behind it, so this was fatal for no
reason — and on Windows it was fatal by default, since Redis has no supported
native Windows build.

The cache is now **pluggable**: Redis when `REDIS_URL` is set and reachable, an
in-process TTL cache otherwise, with an automatic fallback if Redis goes away
mid-flight. This is what lets the Windows edition run without WSL.

---

### 16. CORS was misconfigured for both local and deployed use

```js
// before - backend/src/app.js
app.use(cors({
    origin: process.env.CORS_ORIGIN,     // undefined when unset -> treated as "*"
    credentials: true,                    // ...and "*" + credentials is rejected by browsers
    ...
}));
```

It also accepted only one origin, so a deployment could not allow both the
production frontend and a preview URL.

```js
// after
origin(origin, callback) {
    if (!origin) return callback(null, true);            // curl, health checks
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const denied = new Error(`Origin ${origin} is not allowed by CORS. Add it to CORS_ORIGIN in backend/.env.`);
    denied.status = 403;                                  // 403, not an unhandled 500
    return callback(denied);
}
```

`CORS_ORIGIN` is now a comma-separated list.

---

### 17. No Codeforces retry or error typing

A single failed request — and Codeforces rate-limits aggressively with
`Call limit exceeded` — surfaced as a generic 500. There was no way to tell
"your handle does not exist" from "Codeforces is busy".

The service now retries twice with backoff, fails **fast** on a genuinely bad
handle, and tags errors `CF_BAD_REQUEST` (→ 404) or `CF_UNAVAILABLE` (→ 503) so
the UI can say something useful.

---

### 18. Real database errors were replaced with generic strings

```js
// before - backend/src/model/user.model.js
const getUserByEmail = async (email) => {
    try { return await getUserByEmailDb(email); }
    catch (error) { throw new Error("Error getting user"); }   // original error lost
};
```

A connection failure, a constraint violation and a syntax error all produced
`Error getting user`. The model layer is now a thin pass-through and errors reach
a central handler that logs the real one and returns a stack trace outside
production.

---

### 19. No health endpoint, no graceful shutdown

Free hosting platforms need a health probe, and `SIGTERM` was unhandled so
in-flight requests were cut off on redeploy. Added `GET /health` (reports uptime,
cache backend and live database status) and `SIGINT`/`SIGTERM` handlers that close
the server, the cache and the pool.

---

### 20. Not proxy-aware

Render, Railway and Fly terminate TLS at a proxy. Without `trust proxy`, Express
sees the proxy's IP and treats `Secure` cookies as unsafe. Added
`app.set("trust proxy", 1)`.

---

## Security and auth issues

### 21. One shared OAuth client across all users

```js
// before - backend/src/config/google.js
export const oauth2Client = new google.auth.OAuth2(...);   // module-level singleton

// backend/src/controllers/auth.controller.js
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);                       // mutates shared state
const { data } = await oauth2.userinfo.get();
```

Two users completing sign-in concurrently could overwrite each other's
credentials between `setCredentials` and `userinfo.get()` — meaning one could be
signed in as the other. Now one client is created per request.

---

### 22. Cookies could not work on a real deployment

```js
// before
const options = { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 };
```

`SameSite=Lax` without `Secure` means the session cookie is dropped whenever the
frontend and API are on different domains — i.e. every realistic deployment.
`clearCookie` also passed different options than `cookie`, so logout could leave
the cookie in place.

Now `sameSite` and `secure` are derived from the environment (`Lax` locally,
`None; Secure` in production, both overridable), and one `cookieOptions()` helper
is used for setting and clearing.

---

### 23. OAuth failures rendered a JSON error page

A failed sign-in returned `500 {"error":"Google Login Failed"}` into the browser's
address bar. It now redirects back to the frontend with `?error=...`, and the
landing page explains what happened.

---

### 24. No input validation

`duration`, `difficulty`, `tags` and `handle` all went straight through. Duration
arrived as a string from a `<select>` and was never bounded; an arbitrary
`difficulty` silently fell through to "balanced"; a non-numeric contest id
produced a Postgres cast error as a 500.

Added: duration bounded to 15–300, difficulty checked against a whitelist, tags
normalised, handles pattern-checked, contest ids parsed as integers (`400` for
garbage), and a pre-check for a handle already linked to another account (`409`
instead of a raw unique-constraint 500).

---

## Frontend bugs

### 25. The API URL was hard-coded in six files

`http://localhost:8000` appeared literally in `Home.jsx`, `Setup.jsx`,
`LandingPage.jsx`, `Dashboard.jsx`, `ContestPage.jsx`, `ContestHistoryPage.jsx`,
`ReportHistoryPage.jsx` and `ContestReportPage.jsx`. The build could not be
deployed anywhere.

Replaced with one axios instance reading `VITE_API_URL`, plus a shared
`errorMessage()` helper that turns any failure into a sentence a user can act on.

---

### 26. Setup navigated away even when saving failed

```js
// before - frontend/src/pages/Setup.jsx
try {
    await axios.post("http://localhost:8000/user/setup", { handle }, { withCredentials: true });
    navigate("/landingPage");
} catch (error) {
    console.log(error);        // silent - user is dropped on a broken dashboard
}
```

A typo'd handle logged to the console and left the account with no handle. Now
the error is shown inline and navigation only happens on success.

---

### 27. No route guard

`/dashboard`, `/contest/:id` and the rest rendered for signed-out users, then
every request 401'd and the page sat empty. Added `ProtectedRoute`, which waits
for the session check, redirects to `/` when signed out and to `/setup` when the
handle is not linked yet.

---

### 28. The report page crashed on any incomplete report

```jsx
// before - every section did this, unguarded
{report.strengths.map(...)}
{report.problemAnalysis.map(...)}
```

One missing field from the model and the whole page threw. The report is now
assembled server-side with guaranteed fields, the page falls back cleanly, and
reports written by the old version are detected and offered for regeneration
rather than crashing.

---

### 29. Refreshing on a sub-route returned 404

No SPA fallback was configured, so a hard refresh on `/report/3` hit the host's
404. Added `vercel.json`, `netlify.toml` and `public/_redirects`.

---

### 30. Vite could silently move to another port

Without `strictPort`, a busy 5173 sends Vite to 5174 — which then fails CORS and
the OAuth redirect for reasons that look unrelated. `strictPort: true` makes it
fail loudly instead.

---

### 31. Two pages were near-identical copies

`ContestHistoryPage` and `ReportHistoryPage` were ~250 lines each, differing only
in a heading and a button label. Both now share `ContestCard` and the
`useApiResource` hook.

`useApiResource` also fixed a real lint failure: `react-hooks/set-state-in-effect`
(ESLint 10 / eslint-plugin-react-hooks 7) rejects calling `setState` synchronously
from an effect. Keeping the promise chain inside the hook's own effect satisfies
the rule *and* adds unmount cancellation, so state is never set on a component
that has gone away. `npm run lint` is clean.

---

## Cleanups

| Item | Change |
|---|---|
| `Home-codex.jsx`, `App.jsx`, `react.svg`, `vite.svg` | Unused leftovers, removed |
| `const userId = 1;` in `generateContestReport` | Dead code from debugging, removed |
| `/test-db` route | Debug endpoint that fetched 7 MB from Codeforces on every hit, removed |
| `nodemon` in `dependencies` | Moved to `devDependencies` |
| `express-session`, `passport`, `passport-google-oauth20` | Declared but never imported, removed |
| `<title>vite-project</title>` | Now `CP Contest Generator`, with a description meta tag |
| Package names `backend` / `vite-project` | Renamed, `engines.node >= 20` added |
| Missing `.env.example` | Added for both apps, fully commented |
| `axios` and `dotenv` imported but unused in `index.js` | Removed; `app.js` no longer needs `axios` either now that `/test-db` is gone |
| Contest history N+1 | One query returning problem counts and report availability |
| `/history` response | Now includes `problem_count`, `has_report`, `difficulty`, `tags` |
| Problem URLs | Built server-side, handling gym contests (`contestId >= 100000`) correctly |
| Indexes | Added on `contests(user_id)`, `contests(created_at)`, `contest_problems(contest_id)`, `contest_reports(contest_id)` |
| `TIMESTAMP` columns | Changed to `TIMESTAMPTZ` so contest windows are timezone-safe |

---

## What the report gained

The original report was a single Gemini call over a summary of the contest:
duration, difficulty, solved / attempted / pending counts, an accuracy percentage,
and the name, index and rating of each solved and unsolved problem. Useful as far
as it went, but with no tags stored it had no idea what any problem was *about* —
so its `practiceTopics` were guessed from problem names and ratings alone, and it
could not name a single concrete problem to practise. The prompt also (correctly,
given the data) forbade the model from inferring timing, accuracy patterns or
debugging behaviour, because none of that was measured.

The rewrite splits it in two:

**Measured locally** (`contestAnalytics.service.js`, `recommendation.service.js`)

- Per-problem: submissions, wrong attempts, verdict sequence, minute of first
  attempt, minute solved, and upsolve detection
- Per-topic: solved / failed / never-opened counts, solve rate, average rating,
  wrong attempts, and a priority score that weights *attempted and failed* above
  *never opened*
- Per rating band: solve rates, plus highest-solved vs. lowest-unsolved to locate
  your ceiling
- Verdict mix with a diagnosis for each failure type (WA = incomplete idea,
  TLE = wrong complexity, RE = indexing, …)
- Pacing: first solve, last solve, unused minutes, full solve timeline
- A deterministic 1–10 score, so the headline number cannot drift between
  regenerations of the same contest
- **A practice ladder per weak topic** — real unsolved Codeforces problems
  carrying that tag, laddered from just below the rating you failed at up past
  it, deduplicated across topics, each with a working link

**Written by the model** — coaching prose over those numbers: per-topic verdicts,
a diagnosis and study plan for each weak topic, per-problem notes, recommendations
and next-contest goals. The prompt pins `overallScore` to the computed value and
forbids inventing problems or statistics.

If the model is unavailable, an offline analyser produces the same structure from
the same numbers, and the page says which one wrote it. The report never fails to
render.

---

## Verification

The rewrite was exercised against a real PostgreSQL 16 database and a stub
Codeforces API:

- **Schema** — `db:init` run twice (idempotent), and run over a seeded copy of the
  **original v1 schema** to confirm the `ALTER TABLE` upgrade path adds the new
  columns and preserves existing rows
- **HTTP** — status codes for every route: auth on protected routes, `404` for
  unknown paths, `403` for a contest owned by someone else, `400` for a malformed
  id, `403` + a readable message for a disallowed CORS origin, cookie and Bearer
  authentication, expired-token rejection
- **Full flow** — generate a contest, verify tags and the absence of duplicates,
  simulate submissions across the contest window, check live progress, end the
  contest, generate the report, verify it is cached, regenerate it and confirm the
  upsert leaves exactly one row
- **Analytics** — a fixture with a pre-contest failure, a multi-attempt solve, two
  failures and one post-contest upsolve, asserting every derived statistic
- **Recommendations** — no duplicate suggestions, nothing already solved, nothing
  reused from the contest, every suggestion carrying the right tag and the ladder
  sorted by rating
- **Frontend** — `npm run build` and `npm run lint` both clean
- **Platform scripts** — all three PowerShell scripts parse under PowerShell 7;
  `setup.ps1` run end-to-end and its generated `.env` verified; all four bash
  scripts pass `bash -n`, and `dev.sh` was confirmed to start both servers and
  kill the whole process tree on `SIGINT` and `SIGTERM` with no orphans
