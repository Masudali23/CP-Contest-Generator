import { getProblemset, buildSolvedSet, problemKey, problemUrl } from "./codeforces.service.js";
import { topicMeta } from "../utils/topics.js";

/*
 * Picks concrete follow-up problems for the topics the user did not solve.
 *
 * These come straight from the Codeforces problemset rather than the language
 * model, so every suggestion is a real, still-unsolved problem with a working
 * link - the model is only asked to comment on them.
 */

const PER_TOPIC = 5;
const MAX_TOPICS = 6;

const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

/**
 * Ladder of target ratings for a weak topic: start slightly below the rating
 * the user failed at, then step up past it so practice builds towards the gap.
 */
const buildLadder = (anchorRating) => {
    const base = Math.max(800, Math.round(anchorRating / 100) * 100);
    return [base - 200, base - 100, base, base, base + 100].map((rating) => Math.max(800, Math.min(3500, rating)));
};

export const buildRecommendations = async ({ analytics, submissions, userRating }) => {
    const weakTopics = analytics.weakTopics.slice(0, MAX_TOPICS);

    if (weakTopics.length === 0) {
        return { topics: [], generatedFrom: "codeforces-problemset" };
    }

    let problemset;
    try {
        problemset = await getProblemset();
    } catch (error) {
        console.error("Could not load the Codeforces problemset for recommendations:", error.message);
        return { topics: [], generatedFrom: "unavailable", error: error.message };
    }

    const solved = buildSolvedSet(submissions);

    // Never re-suggest a problem that was already part of this contest.
    const usedInContest = new Set(analytics.problems.map((problem) => problem.key));
    const alreadySuggested = new Set();

    const topics = weakTopics.map((topic) => {
        const meta = topicMeta(topic.tag);

        const unsolvedRatings = topic.problems
            .filter((problem) => problem.status !== "solved")
            .map((problem) => problem.rating)
            .filter(Boolean);

        const anchorRating =
            unsolvedRatings.length > 0
                ? Math.min(...unsolvedRatings)
                : topic.averageRating ?? userRating ?? 1200;

        const ladder = buildLadder(anchorRating);

        const candidates = problemset.filter((problem) => {
            if (!problem.rating || !problem.contestId) return false;
            if (!problem.tags?.includes(topic.tag)) return false;

            const key = problemKey(problem.contestId, problem.index);
            return !solved.has(key) && !usedInContest.has(key) && !alreadySuggested.has(key);
        });

        const picks = [];

        for (const target of ladder) {
            const pool = shuffle(
                candidates.filter((problem) => {
                    const key = problemKey(problem.contestId, problem.index);
                    return !alreadySuggested.has(key) && Math.abs(problem.rating - target) <= 100;
                })
            );

            const chosen = pool[0];
            if (!chosen) continue;

            const key = problemKey(chosen.contestId, chosen.index);
            alreadySuggested.add(key);

            picks.push({
                name: chosen.name,
                contestId: chosen.contestId,
                index: chosen.index,
                rating: chosen.rating,
                tags: chosen.tags,
                url: problemUrl(chosen.contestId, chosen.index),
            });

            if (picks.length >= PER_TOPIC) break;
        }

        // Widen the search if the strict ladder came up short.
        if (picks.length < PER_TOPIC) {
            const fallback = shuffle(
                candidates.filter((problem) => {
                    const key = problemKey(problem.contestId, problem.index);
                    return (
                        !alreadySuggested.has(key) &&
                        problem.rating >= Math.max(800, anchorRating - 300) &&
                        problem.rating <= anchorRating + 300
                    );
                })
            );

            for (const chosen of fallback) {
                if (picks.length >= PER_TOPIC) break;
                const key = problemKey(chosen.contestId, chosen.index);
                alreadySuggested.add(key);
                picks.push({
                    name: chosen.name,
                    contestId: chosen.contestId,
                    index: chosen.index,
                    rating: chosen.rating,
                    tags: chosen.tags,
                    url: problemUrl(chosen.contestId, chosen.index),
                });
            }
        }

        return {
            tag: topic.tag,
            label: meta.label,
            why: meta.blurb,
            drills: meta.drills,
            resources: meta.resources,
            missedInContest: topic.problems
                .filter((problem) => problem.status !== "solved")
                .map((problem) => ({
                    name: problem.name,
                    index: problem.index,
                    rating: problem.rating,
                    url: problem.url,
                    status: problem.status,
                })),
            stats: {
                total: topic.total,
                solved: topic.solved,
                failed: topic.failed,
                untouched: topic.untouched,
                solveRate: topic.solveRate,
                averageRating: topic.averageRating,
            },
            practiceProblems: picks.sort((a, b) => a.rating - b.rating),
            problemsetUrl: `https://codeforces.com/problemset?tags=${encodeURIComponent(topic.tag)}`,
        };
    });

    return { topics, generatedFrom: "codeforces-problemset" };
};

export default buildRecommendations;
