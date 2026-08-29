# CP Contest Generator

Generate personalised Codeforces practice contests from your own rating and solve
history, then get a detailed, topic-aware performance report that tells you
**which topics cost you problems** and **exactly which problems to practise next**.

This repository ships the project as **two self-contained editions**:

| Edition | Folder | Built for |
|---|---|---|
| **Windows** | [`windows/`](windows/) | Windows 10/11, natively. PowerShell scripts, **no WSL, no Docker, no Linux subsystem.** |
| **macOS** | [`macos/`](macos/) | macOS on Apple silicon and Intel. Homebrew + bash scripts (bash 3.2 compatible). |

The application code in both editions is **byte-for-byte identical**. Only the
setup/run tooling and the documentation differ, so a fix applied in one edition
applies cleanly to the other.

```
CP-Contest-Generator/
├── windows/                 Windows edition
│   ├── backend/             Express API
│   ├── frontend/            React + Vite client
│   ├── scripts/             setup.ps1, dev.ps1, doctor.ps1 (+ .cmd shims)
│   ├── README.md            setup and usage
│   └── DEPLOYMENT.md        free hosting walkthrough
├── macos/                   macOS edition
│   ├── backend/             identical to windows/backend
│   ├── frontend/            identical to windows/frontend
│   ├── scripts/             setup.sh, dev.sh, doctor.sh, services.sh
│   ├── README.md            setup and usage
│   └── DEPLOYMENT.md        free hosting walkthrough
└── FIXES.md                 every bug found in the original code and how it was fixed
```

---

## Which folder do I use?

Pick the one that matches your machine and work entirely inside it. You never
need the other folder.

```powershell
# Windows (PowerShell)
cd windows
npm run setup
npm run dev
```

```bash
# macOS (Terminal)
cd macos
npm run setup
npm run dev
```

Then open <http://localhost:5173>.

Full instructions: [`windows/README.md`](windows/README.md) · [`macos/README.md`](macos/README.md)

---

## What it does

1. **Sign in with Google** and link your Codeforces handle.
2. **Generate a contest.** Pick topics, a difficulty preset and a duration. The
   API reads your live Codeforces rating and your entire submission history,
   then builds a rating ladder of problems you have **never solved**.
3. **Solve on Codeforces.** The contest page tracks your progress live, polling
   your submissions once a minute. Problem tags stay hidden until the timer ends
   so they do not spoil the solution.
4. **Read the report.** When the contest ends you get a full debrief.

## The performance report

Everything numeric is measured from your real Codeforces submissions, restricted
to the contest window. A language model writes the coaching prose on top of those
numbers; if it is unavailable the built-in offline analyser writes it instead, so
the report always renders.

| Section | What it tells you |
|---|---|
| **Score and headline stats** | Deterministic 1–10 score, completion rate, problem accuracy, submission accuracy, problems never opened |
| **Topic performance** | Every tag in the contest with a solve-rate bar, failures, unopened count, average rating and a strong/developing/weak verdict |
| **Topics you did not solve** | For each weak topic: what went wrong, what to learn, the problems you missed, **a five-problem practice ladder of real unsolved Codeforces problems**, and study links |
| **Difficulty analysis** | Highest solved vs. lowest unsolved rating, per-rating-band solve rates, and whether you broke through your current ceiling |
| **Submission verdicts** | The WA / TLE / MLE / RE mix and what each pattern says about your failure mode — wrong idea vs. wrong complexity vs. sloppy implementation |
| **Time management** | First solve, last solve, unused minutes and a minute-by-minute solve timeline |
| **Problem-by-problem** | Per problem: status, submissions, wrong attempts, verdicts, solve minute, upsolve detection, tags and a coaching note |
| **Recommendations and goals** | Concrete next steps and measurable targets for your next contest |

The practice ladders are the core of it: for each topic that cost you a problem,
the API searches the live Codeforces problemset for problems you have **not**
solved, tagged with that topic, laddered from just below the rating you failed at
up past it. Every suggestion is a real problem with a working link.

## Tech stack

Unchanged from the original project.

- **Frontend** — React 19, Vite, Tailwind CSS 4, React Router 7, axios
- **Backend** — Node.js 20+, Express 5, PostgreSQL (`pg`), Redis (optional), JWT cookies
- **Auth** — Google OAuth 2.0 via `googleapis`
- **AI** — Google Gemini via `@google/genai` (optional)
- **Data** — the public Codeforces API

Redis is now **optional**: with `REDIS_URL` empty the API uses an in-process TTL
cache. That is what makes the Windows edition work without WSL, since Redis has
no supported native Windows build.

## Corrections to the original code

The original project had a number of bugs that stopped features working — the
dashboard's topic and difficulty pickers were ignored, problem tags were never
stored, `redis.set(..., "EX", ttl)` used the wrong client's signature so the cache
never expired, a `ReferenceError` inside every cache-fallback `catch` block turned
cache misses into 500s, and more.

All of them are listed with before/after code in **[FIXES.md](FIXES.md)**.

## Deploying for free

Both editions deploy the same way. The documented combination is Vercel +
Render + Neon + Upstash, all on free tiers, with alternatives listed:

- [`windows/DEPLOYMENT.md`](windows/DEPLOYMENT.md)
- [`macos/DEPLOYMENT.md`](macos/DEPLOYMENT.md)

## Licence

ISC
