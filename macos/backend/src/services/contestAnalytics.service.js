import { problemKey, problemUrl } from "./codeforces.service.js";
import { topicMeta } from "../utils/topics.js";

/*
 * Turns raw Codeforces submissions into the statistics the report is built from.
 *
 * The original report only knew four numbers (solved / attempted / pending /
 * accuracy) and had no idea which *topics* the user struggled with, because
 * problem tags were never stored. Everything below is computed deterministically
 * so the numbers in the report are trustworthy even when the language model is
 * unavailable.
 */

const VERDICT_LABELS = {
    OK: "Accepted",
    WRONG_ANSWER: "Wrong Answer",
    TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
    RUNTIME_ERROR: "Runtime Error",
    COMPILATION_ERROR: "Compilation Error",
    IDLENESS_LIMIT_EXCEEDED: "Idleness Limit Exceeded",
    CHALLENGED: "Hacked",
    SKIPPED: "Skipped",
    PARTIAL: "Partial",
    TESTING: "Testing",
    FAILED: "Failed",
};

const VERDICT_DIAGNOSIS = {
    WRONG_ANSWER: "Wrong answers usually mean the idea was incomplete or an edge case was missed - test on small hand-made cases before submitting.",
    TIME_LIMIT_EXCEEDED: "Time limit failures point at complexity, not correctness - re-check the operation count against the constraints before coding.",
    MEMORY_LIMIT_EXCEEDED: "Memory limit failures usually come from oversized arrays or storing state you can recompute.",
    RUNTIME_ERROR: "Runtime errors are almost always out-of-bounds indexing, division by zero or deep recursion - add asserts while practising.",
    COMPILATION_ERROR: "Compilation errors cost pure time - compile locally with the same flags Codeforces uses before submitting.",
    IDLENESS_LIMIT_EXCEEDED: "Idleness limit means output was not flushed in an interactive problem.",
};

const RATING_BANDS = [
    { min: 0, max: 999, label: "800-999" },
    { min: 1000, max: 1199, label: "1000-1199" },
    { min: 1200, max: 1399, label: "1200-1399" },
    { min: 1400, max: 1599, label: "1400-1599" },
    { min: 1600, max: 1899, label: "1600-1899" },
    { min: 1900, max: 2199, label: "1900-2199" },
    { min: 2200, max: 2499, label: "2200-2499" },
    { min: 2500, max: 9999, label: "2500+" },
];

const bandFor = (rating) => {
    if (!rating) return "unrated";
    return RATING_BANDS.find((band) => rating >= band.min && rating <= band.max)?.label ?? "unrated";
};

const percent = (part, whole) => (whole === 0 ? 0 : Math.round((part * 100) / whole));

const minutesBetween = (fromMs, toMs) => Math.max(0, Math.round((toMs - fromMs) / 60_000));

/**
 * @param {object}   args
 * @param {object}   args.contest         row from `contests`
 * @param {object[]} args.problems        rows from `contest_problems` (with tags)
 * @param {object[]} args.submissions     Codeforces user.status result
 * @param {object}   args.user            row from `users`
 */
export const analyseContest = ({ contest, problems, submissions, user }) => {
    const startMs = new Date(contest.created_at).getTime();
    const plannedEndMs = startMs + contest.duration * 60 * 1000;
    const actualEndMs = contest.ended_at ? new Date(contest.ended_at).getTime() : null;

    // Window used to decide whether a submission belongs to *this* contest.
    // The original code counted every submission the user had ever made, so a
    // problem failed months earlier was reported as "wrong" the moment the
    // contest started.
    const windowEndMs = Math.min(actualEndMs ?? plannedEndMs, plannedEndMs);
    const elapsedMinutes = minutesBetween(startMs, Math.min(Date.now(), windowEndMs));

    const problemIds = new Set(problems.map((problem) => problemKey(problem.contest_id_cf, problem.problem_index)));

    const inWindow = submissions
        .filter((submission) => {
            if (!submission.problem?.contestId) return false;
            const key = problemKey(submission.problem.contestId, submission.problem.index);
            if (!problemIds.has(key)) return false;

            const submittedMs = submission.creationTimeSeconds * 1000;
            return submittedMs >= startMs && submittedMs <= windowEndMs;
        })
        .sort((a, b) => a.creationTimeSeconds - b.creationTimeSeconds);

    // Upsolving: correct submissions for contest problems made after the window closed.
    const upsolved = new Set();
    for (const submission of submissions) {
        if (submission.verdict !== "OK" || !submission.problem?.contestId) continue;
        const key = problemKey(submission.problem.contestId, submission.problem.index);
        if (!problemIds.has(key)) continue;
        if (submission.creationTimeSeconds * 1000 > windowEndMs) upsolved.add(key);
    }

    const byProblem = new Map();
    for (const submission of inWindow) {
        const key = problemKey(submission.problem.contestId, submission.problem.index);
        if (!byProblem.has(key)) byProblem.set(key, []);
        byProblem.get(key).push(submission);
    }

    const verdictCounts = {};
    const languages = new Set();

    const problemReports = problems.map((problem) => {
        const key = problemKey(problem.contest_id_cf, problem.problem_index);
        const attempts = byProblem.get(key) ?? [];

        let status = "unattempted";
        let solvedAtMs = null;
        let wrongAttempts = 0;
        const verdicts = [];

        for (const submission of attempts) {
            const verdict = submission.verdict ?? "TESTING";
            verdicts.push(VERDICT_LABELS[verdict] ?? verdict);
            verdictCounts[verdict] = (verdictCounts[verdict] ?? 0) + 1;
            if (submission.programmingLanguage) languages.add(submission.programmingLanguage);

            if (verdict === "OK") {
                if (solvedAtMs === null) solvedAtMs = submission.creationTimeSeconds * 1000;
            } else if (solvedAtMs === null && verdict !== "TESTING" && verdict !== "SKIPPED") {
                wrongAttempts += 1;
            }
        }

        if (solvedAtMs !== null) status = "solved";
        else if (attempts.length > 0) status = "failed";
        else if (upsolved.has(key)) status = "upsolved";

        return {
            key,
            position: problem.position,
            index: problem.problem_index,
            name: problem.problem_name,
            rating: problem.rating ?? null,
            ratingBand: bandFor(problem.rating),
            tags: problem.tags ?? [],
            url: problemUrl(problem.contest_id_cf, problem.problem_index),
            status,
            attempts: attempts.length,
            wrongAttempts,
            verdicts,
            solvedAtMinute: solvedAtMs === null ? null : minutesBetween(startMs, solvedAtMs),
            firstAttemptMinute:
                attempts.length === 0 ? null : minutesBetween(startMs, attempts[0].creationTimeSeconds * 1000),
            upsolvedAfterContest: status !== "solved" && upsolved.has(key),
        };
    });

    const solvedProblems = problemReports.filter((problem) => problem.status === "solved");
    const failedProblems = problemReports.filter((problem) => problem.status === "failed");
    const untouchedProblems = problemReports.filter(
        (problem) => problem.status === "unattempted" || problem.status === "upsolved"
    );

    /* ---------------------------------------------------------------- topics */

    const topicStats = new Map();

    for (const problem of problemReports) {
        for (const tag of problem.tags) {
            if (!topicStats.has(tag)) {
                topicStats.set(tag, {
                    tag,
                    total: 0,
                    solved: 0,
                    failed: 0,
                    untouched: 0,
                    wrongAttempts: 0,
                    ratings: [],
                    problems: [],
                });
            }

            const stat = topicStats.get(tag);
            stat.total += 1;
            stat.wrongAttempts += problem.wrongAttempts;
            if (problem.rating) stat.ratings.push(problem.rating);
            stat.problems.push({
                name: problem.name,
                index: problem.index,
                rating: problem.rating,
                status: problem.status,
                url: problem.url,
            });

            if (problem.status === "solved") stat.solved += 1;
            else if (problem.status === "failed") stat.failed += 1;
            else stat.untouched += 1;
        }
    }

    const topicBreakdown = [...topicStats.values()]
        .map((stat) => {
            const meta = topicMeta(stat.tag);
            const unsolved = stat.failed + stat.untouched;
            const solveRate = percent(stat.solved, stat.total);

            /*
             * Priority ranks how urgently a topic needs practice.
             * Attempting and failing is a stronger signal than never opening the
             * problem, so failures weigh more than untouched problems.
             */
            const priority = stat.failed * 3 + stat.untouched * 2 + Math.min(stat.wrongAttempts, 6);

            return {
                tag: stat.tag,
                label: meta.label,
                total: stat.total,
                solved: stat.solved,
                failed: stat.failed,
                untouched: stat.untouched,
                unsolved,
                wrongAttempts: stat.wrongAttempts,
                solveRate,
                averageRating: stat.ratings.length
                    ? Math.round(stat.ratings.reduce((sum, rating) => sum + rating, 0) / stat.ratings.length)
                    : null,
                priority,
                problems: stat.problems,
            };
        })
        .sort((a, b) => b.priority - a.priority || a.solveRate - b.solveRate);

    const weakTopics = topicBreakdown.filter((topic) => topic.unsolved > 0);
    const strongTopics = topicBreakdown
        .filter((topic) => topic.solved > 0 && topic.unsolved === 0)
        .sort((a, b) => b.solved - a.solved || (b.averageRating ?? 0) - (a.averageRating ?? 0));

    /* ---------------------------------------------------------- rating bands */

    const bandStats = new Map();
    for (const problem of problemReports) {
        const band = problem.ratingBand;
        if (!bandStats.has(band)) bandStats.set(band, { band, total: 0, solved: 0, failed: 0 });
        const stat = bandStats.get(band);
        stat.total += 1;
        if (problem.status === "solved") stat.solved += 1;
        else if (problem.status === "failed") stat.failed += 1;
    }

    const ratingBreakdown = [...bandStats.values()]
        .map((stat) => ({ ...stat, solveRate: percent(stat.solved, stat.total) }))
        .sort((a, b) => a.band.localeCompare(b.band, undefined, { numeric: true }));

    const solvedRatings = solvedProblems.map((problem) => problem.rating).filter(Boolean);
    const unsolvedRatings = [...failedProblems, ...untouchedProblems]
        .map((problem) => problem.rating)
        .filter(Boolean);

    const highestSolvedRating = solvedRatings.length ? Math.max(...solvedRatings) : null;
    const lowestUnsolvedRating = unsolvedRatings.length ? Math.min(...unsolvedRatings) : null;

    /* -------------------------------------------------------------- verdicts */

    const totalSubmissions = inWindow.length;
    const verdictBreakdown = Object.entries(verdictCounts)
        .map(([verdict, count]) => ({
            verdict,
            label: VERDICT_LABELS[verdict] ?? verdict,
            count,
            share: percent(count, totalSubmissions),
            diagnosis: VERDICT_DIAGNOSIS[verdict] ?? null,
        }))
        .sort((a, b) => b.count - a.count);

    const dominantFailure = verdictBreakdown.find((entry) => entry.verdict !== "OK") ?? null;

    /* ------------------------------------------------------- time management */

    const solveTimeline = solvedProblems
        .map((problem) => ({
            index: problem.index,
            name: problem.name,
            rating: problem.rating,
            minute: problem.solvedAtMinute,
        }))
        .sort((a, b) => a.minute - b.minute);

    const lastSolveMinute = solveTimeline.length ? solveTimeline[solveTimeline.length - 1].minute : null;
    const averageSolveMinutes = solveTimeline.length
        ? Math.round(solveTimeline.reduce((sum, entry) => sum + entry.minute, 0) / solveTimeline.length)
        : null;

    const unusedMinutes =
        lastSolveMinute === null ? contest.duration : Math.max(0, contest.duration - lastSolveMinute);

    /* ---------------------------------------------------------------- totals */

    const solvedCount = solvedProblems.length;
    const failedCount = failedProblems.length;
    const attemptedCount = solvedCount + failedCount;
    const totalProblems = problemReports.length;

    const submissionAccuracy = percent(verdictCounts.OK ?? 0, totalSubmissions);
    const problemAccuracy = percent(solvedCount, attemptedCount);
    const completionRate = percent(solvedCount, totalProblems);

    /*
     * Deterministic 1-10 score. The language model is asked to respect it so the
     * headline number cannot drift between regenerations of the same report.
     */
    const completionScore = (completionRate / 100) * 5;
    const accuracyScore = (problemAccuracy / 100) * 2;
    const engagementScore = (percent(attemptedCount, totalProblems) / 100) * 1.5;
    const ceilingScore =
        highestSolvedRating && user?.rating ? Math.max(0, Math.min(1.5, (highestSolvedRating - user.rating + 200) / 400)) : 0.5;

    const overallScore = Math.max(
        1,
        Math.min(10, Math.round(completionScore + accuracyScore + engagementScore + ceilingScore))
    );

    return {
        contest: {
            id: contest.id,
            durationMinutes: contest.duration,
            difficulty: contest.difficulty,
            requestedTags: contest.tags ?? [],
            startedAt: new Date(startMs).toISOString(),
            endedAt: actualEndMs ? new Date(actualEndMs).toISOString() : null,
            isEnded: contest.is_ended,
            elapsedMinutes,
        },
        user: {
            handle: user?.handle ?? null,
            rating: user?.rating ?? null,
            rank: user?.rank ?? null,
        },
        totals: {
            totalProblems,
            solved: solvedCount,
            failed: failedCount,
            untouched: untouchedProblems.length,
            attempted: attemptedCount,
            totalSubmissions,
            completionRate,
            problemAccuracy,
            submissionAccuracy,
            overallScore,
        },
        problems: problemReports,
        solvedProblems,
        failedProblems,
        untouchedProblems,
        topicBreakdown,
        weakTopics,
        strongTopics,
        ratingBreakdown,
        difficultyCeiling: {
            highestSolvedRating,
            lowestUnsolvedRating,
            userRating: user?.rating ?? null,
            brokeCeiling: Boolean(highestSolvedRating && user?.rating && highestSolvedRating > user.rating),
        },
        verdictBreakdown,
        dominantFailure,
        timeManagement: {
            durationMinutes: contest.duration,
            firstSolveMinute: solveTimeline.length ? solveTimeline[0].minute : null,
            lastSolveMinute,
            averageSolveMinutes,
            unusedMinutes,
            solveTimeline,
        },
        languagesUsed: [...languages],
    };
};

export { bandFor, VERDICT_LABELS };
