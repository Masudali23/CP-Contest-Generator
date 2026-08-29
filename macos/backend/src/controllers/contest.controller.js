import { getUserById, updateUserRating } from "../model/user.model.js";
import {
    createContest,
    createContestReport,
    endContestById,
    getContestById,
    getContestReportById,
    getUserContestHistory,
} from "../model/contest.model.js";
import { createContestProblems, getContestProblemsById } from "../model/contestProblems.model.js";
import {
    buildSolvedSet,
    getProblemset,
    getUserInfo,
    getUserSubmissions,
    problemKey,
    problemUrl,
} from "../services/codeforces.service.js";
import { analyseContest } from "../services/contestAnalytics.service.js";
import { buildRecommendations } from "../services/recommendation.service.js";
import { buildReport } from "../services/report.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const MIN_CF_RATING = 800;
const MAX_CF_RATING = 3500;
const ALLOWED_DIFFICULTIES = new Set(["easy", "balanced", "hard"]);
const MIN_DURATION = 15;
const MAX_DURATION = 300;

const clampRating = (rating) => Math.max(MIN_CF_RATING, Math.min(MAX_CF_RATING, Math.round(rating / 100) * 100));

/** Rating ladder for a difficulty preset, clamped into the range Codeforces actually uses. */
const buildTargetRatings = (userRating, difficulty) => {
    const offsets =
        difficulty === "easy"
            ? [-300, -200, -100, 0]
            : difficulty === "hard"
              ? [0, 100, 200, 300, 400]
              : [-200, -100, 0, 100, 200];

    return offsets.map((offset) => clampRating(userRating + offset));
};

/**
 * Picks one unsolved problem per target rating.
 * `chosen` prevents the same problem being selected twice, which the original
 * code allowed whenever two targets clamped to the same rating band.
 */
const pickProblems = ({ problemset, solved, targetRatings, tags, tolerance = 100 }) => {
    const chosen = new Set();
    const selected = [];

    const matchesTags = (problem) => tags.length === 0 || problem.tags?.some((tag) => tags.includes(tag));

    for (const target of targetRatings) {
        const candidates = problemset.filter((problem) => {
            if (!problem.rating || !problem.contestId) return false;

            const key = problemKey(problem.contestId, problem.index);
            if (solved.has(key) || chosen.has(key)) return false;

            return Math.abs(problem.rating - target) <= tolerance && matchesTags(problem);
        });

        if (candidates.length === 0) continue;

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        chosen.add(problemKey(pick.contestId, pick.index));
        selected.push(pick);
    }

    return selected;
};

const persistContest = async ({ user, difficulty, duration, tags, selectedProblems, userRating }) => {
    const contest = await createContest({
        user_id: user.id,
        duration,
        difficulty,
        tags,
        user_rating_at_start: userRating,
    });

    await createContestProblems(
        selectedProblems.map((problem, position) => ({
            contest_id: contest.id,
            contest_id_cf: problem.contestId,
            problem_index: problem.index,
            problem_name: problem.name,
            rating: problem.rating ?? null,
            // Tags are what make the topic-level report possible; the original
            // schema dropped them entirely.
            tags: problem.tags ?? [],
            position: position + 1,
        }))
    );

    return contest;
};

/** Loads a contest and checks it belongs to the caller. */
const loadOwnedContest = async (contestId, userId) => {
    const numericId = Number.parseInt(contestId, 10);

    if (!Number.isInteger(numericId) || numericId <= 0) {
        return { error: { status: 400, message: "Invalid contest id" } };
    }

    const contest = await getContestById(numericId);

    if (!contest) return { error: { status: 404, message: "Contest not found" } };
    if (contest.user_id !== userId) return { error: { status: 403, message: "This contest belongs to another user" } };

    return { contest };
};

/** Auto-closes a contest whose scheduled duration has already elapsed. */
const closeIfExpired = async (contest) => {
    if (contest.is_ended) return contest;

    const endMs = new Date(contest.created_at).getTime() + contest.duration * 60 * 1000;
    if (Date.now() < endMs) return contest;

    return (await endContestById(contest.id)) ?? contest;
};

/* ------------------------------------------------------------ generation */

const generateContest = asyncHandler(async (req, res) => {
    const rawTags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    const tags = rawTags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim().toLowerCase());

    const difficulty = ALLOWED_DIFFICULTIES.has(req.body?.difficulty) ? req.body.difficulty : "balanced";

    // The frontend sends duration as a string from a <select>.
    const duration = Number.parseInt(req.body?.duration, 10);
    if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
        return res.status(400).json({ error: `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes` });
    }

    const dbUser = await getUserById(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "User not found" });
    if (!dbUser.handle) return res.status(400).json({ error: "Link your Codeforces handle before generating a contest" });

    let profile;
    let submissions;
    let problemset;

    try {
        [profile, submissions, problemset] = await Promise.all([
            getUserInfo(dbUser.handle),
            getUserSubmissions(dbUser.handle),
            getProblemset(),
        ]);
    } catch (error) {
        const status = error.code === "CF_BAD_REQUEST" ? 400 : 503;
        return res.status(status).json({ error: error.message });
    }

    const userRating = profile.rating ?? dbUser.rating ?? 1000;

    if (profile.rating && profile.rating !== dbUser.rating) {
        // Was previously writing `user.rating`, which is undefined for unrated
        // accounts and blanked the stored rating.
        await updateUserRating({
            id: dbUser.id,
            rating: profile.rating,
            maxRating: profile.maxRating,
            rank: profile.rank,
        });
    }

    const solved = buildSolvedSet(submissions);
    const targetRatings = buildTargetRatings(userRating, difficulty);

    let selectedProblems = pickProblems({ problemset, solved, targetRatings, tags });

    // A narrow tag selection can leave the ladder empty; widen the rating
    // tolerance before giving up so the user still gets a contest.
    if (selectedProblems.length < Math.min(3, targetRatings.length) && tags.length > 0) {
        selectedProblems = pickProblems({ problemset, solved, targetRatings, tags, tolerance: 300 });
    }

    if (selectedProblems.length === 0) {
        return res.status(422).json({
            error: "No unsolved problems matched those filters. Try fewer topics or a different difficulty.",
        });
    }

    const contest = await persistContest({
        user: dbUser,
        difficulty,
        duration,
        tags,
        selectedProblems,
        userRating,
    });

    res.status(201).json({
        contestId: contest.id,
        problemCount: selectedProblems.length,
        requestedProblemCount: targetRatings.length,
    });
});

/** Fixed 800-1000 warm-up ladder, used by the "quick contest" button. */
const generateTestContest = asyncHandler(async (req, res) => {
    const duration = Number.parseInt(req.body?.duration, 10) || 120;

    if (duration < MIN_DURATION || duration > MAX_DURATION) {
        return res.status(400).json({ error: `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes` });
    }

    const dbUser = await getUserById(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "User not found" });
    if (!dbUser.handle) return res.status(400).json({ error: "Link your Codeforces handle before generating a contest" });

    let submissions;
    let problemset;

    try {
        [submissions, problemset] = await Promise.all([getUserSubmissions(dbUser.handle), getProblemset()]);
    } catch (error) {
        return res.status(503).json({ error: error.message });
    }

    const solved = buildSolvedSet(submissions);
    const selectedProblems = pickProblems({
        problemset,
        solved,
        targetRatings: [800, 800, 800, 900, 900, 1000],
        tags: [],
        tolerance: 0,
    });

    if (selectedProblems.length === 0) {
        return res.status(422).json({ error: "No unsolved warm-up problems left - try the full generator instead." });
    }

    const contest = await persistContest({
        user: dbUser,
        difficulty: "easy",
        duration,
        tags: [],
        selectedProblems,
        userRating: dbUser.rating ?? null,
    });

    res.status(201).json({ contestId: contest.id, problemCount: selectedProblems.length });
});

/* ----------------------------------------------------------- live contest */

const getContestProblems = asyncHandler(async (req, res) => {
    const { contest: found, error } = await loadOwnedContest(req.params.contestId, req.user.id);
    if (error) return res.status(error.status).json({ error: error.message });

    const contest = await closeIfExpired(found);
    const problems = await getContestProblemsById(contest.id);
    const user = await getUserById(req.user.id);

    const startMs = new Date(contest.created_at).getTime();

    let submissions = [];
    try {
        submissions = await getUserSubmissions(user.handle, { fresh: req.query.refresh === "true" });
    } catch (cfError) {
        console.error("Could not refresh Codeforces status:", cfError.message);
    }

    const solved = new Set();
    const attempted = new Set();

    for (const submission of submissions) {
        if (!submission.problem?.contestId) continue;

        // Only count submissions made after the contest started. Otherwise a
        // problem the user failed months ago showed up as "wrong" instantly.
        if (submission.creationTimeSeconds * 1000 < startMs) continue;

        const key = problemKey(submission.problem.contestId, submission.problem.index);
        attempted.add(key);
        if (submission.verdict === "OK") solved.add(key);
    }

    const progress = problems.map((problem) => {
        const key = problemKey(problem.contest_id_cf, problem.problem_index);

        return {
            ...problem,
            url: problemUrl(problem.contest_id_cf, problem.problem_index),
            status: solved.has(key) ? "solved" : attempted.has(key) ? "wrong" : "pending",
        };
    });

    res.status(200).json({
        contestId: contest.id,
        problems: progress,
        duration: contest.duration,
        createdAt: contest.created_at,
        endedAt: contest.ended_at,
        isEnded: contest.is_ended,
        difficulty: contest.difficulty,
        tags: contest.tags ?? [],
        solvedCount: progress.filter((problem) => problem.status === "solved").length,
        handle: user.handle,
    });
});

const endContest = asyncHandler(async (req, res) => {
    const { contest, error } = await loadOwnedContest(req.params.contestId, req.user.id);
    if (error) return res.status(error.status).json({ error: error.message });

    if (contest.is_ended) {
        return res.status(200).json({ message: "Contest already ended", contest });
    }

    const ended = await endContestById(contest.id);
    res.status(200).json({ message: "Contest ended successfully", contest: ended });
});

const getContestHistory = asyncHandler(async (req, res) => {
    const contests = await getUserContestHistory(req.user.id);
    res.json({ contests });
});

/* ---------------------------------------------------------------- reports */

const buildAndStoreReport = async ({ contest, userId }) => {
    const problems = await getContestProblemsById(contest.id);
    const user = await getUserById(userId);

    let submissions = [];
    try {
        submissions = await getUserSubmissions(user.handle, { fresh: true });
    } catch (error) {
        console.error("Could not load submissions for the report:", error.message);
    }

    const analytics = analyseContest({ contest, problems, submissions, user });

    const recommendations = await buildRecommendations({
        analytics,
        submissions,
        userRating: user.rating,
    });

    const report = await buildReport(analytics, recommendations);

    await createContestReport({ contest_id: contest.id, report });

    return report;
};

const generateContestReport = asyncHandler(async (req, res) => {
    const { contest: found, error } = await loadOwnedContest(req.params.contestId, req.user.id);
    if (error) return res.status(error.status).json({ error: error.message });

    const contest = await closeIfExpired(found);
    const refresh = req.query.refresh === "true" || req.body?.refresh === true;

    if (!refresh) {
        const existing = await getContestReportById(contest.id);
        if (existing) {
            return res.status(200).json({ report: existing.report, cached: true });
        }
    }

    const report = await buildAndStoreReport({ contest, userId: req.user.id });

    res.status(200).json({ report, cached: false });
});

const getContestReport = asyncHandler(async (req, res) => {
    const { contest, error } = await loadOwnedContest(req.params.contestId, req.user.id);
    if (error) return res.status(error.status).json({ error: error.message });

    const stored = await getContestReportById(contest.id);
    if (!stored) return res.status(404).json({ error: "Report not generated yet" });

    res.status(200).json({ report: stored.report, generatedAt: stored.generated_at, cached: true });
});

export {
    generateContest,
    generateTestContest,
    getContestProblems,
    endContest,
    getContestHistory,
    generateContestReport,
    getContestReport,
};
