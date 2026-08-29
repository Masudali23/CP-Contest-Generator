import { buildReportPrompt } from "../prompts/contestReportPrompt.js";
import { generateJson, isAiConfigured } from "./geminiService.js";

/*
 * Assembles the final report object: deterministic analytics + concrete practice
 * problems + the model's narrative. If the model is unavailable the offline
 * builder below produces the same shape from the analytics alone, so a missing
 * or rate-limited API key degrades the prose rather than breaking the page.
 */

const plural = (count, singular, pluralForm = `${singular}s`) =>
    `${count} ${count === 1 ? singular : pluralForm}`;

/** "1 problem was" / "2 problems were" */
const wasWere = (count) => (count === 1 ? "was" : "were");

const list = (items) => {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
};

/* ------------------------------------------------------- offline narrative */

const buildOfflineNarrative = (analytics, recommendations) => {
    const { totals, timeManagement, difficultyCeiling, dominantFailure } = analytics;

    const weakLabels = analytics.weakTopics.slice(0, 4).map((topic) => topic.label);
    const strongLabels = analytics.strongTopics.slice(0, 3).map((topic) => topic.label);

    const strengths = [];
    if (totals.solved > 0) {
        strengths.push(`Solved ${totals.solved} of ${totals.totalProblems} problems.`);
    }
    if (strongLabels.length > 0) {
        strengths.push(`Cleared every problem tagged ${list(strongLabels)}.`);
    }
    if (totals.problemAccuracy >= 70 && totals.attempted > 0) {
        strengths.push(`${totals.problemAccuracy}% of the problems you opened ended in an accepted solution.`);
    }
    if (difficultyCeiling.brokeCeiling) {
        strengths.push(
            `Solved a ${difficultyCeiling.highestSolvedRating}-rated problem, above your current rating of ${difficultyCeiling.userRating}.`
        );
    }
    if (strengths.length === 0) {
        strengths.push("You started the contest - the fastest way to improve is to keep entering them.");
    }

    const weaknesses = [];
    if (totals.untouched > 0) {
        weaknesses.push(
            `${plural(totals.untouched, "problem")} ${wasWere(totals.untouched)} never opened during the contest window.`
        );
    }
    if (totals.failed > 0) {
        weaknesses.push(`${plural(totals.failed, "problem")} ${wasWere(totals.failed)} attempted but not solved.`);
    }
    if (weakLabels.length > 0) {
        weaknesses.push(`Unsolved problems clustered around ${list(weakLabels)}.`);
    }
    if (dominantFailure && dominantFailure.count > 0) {
        weaknesses.push(`${dominantFailure.label} accounted for ${plural(dominantFailure.count, "submission")}.`);
    }
    if (weaknesses.length === 0) {
        weaknesses.push("Nothing stands out as a weakness in this contest - raise the difficulty next time.");
    }

    const summary =
        totals.totalSubmissions === 0
            ? `No submissions were recorded for this contest, so there is no performance data to analyse. The contest contained ${plural(
                  totals.totalProblems,
                  "problem"
              )} across ${plural(analytics.ratingBreakdown.length, "rating band")}. Re-run it and submit, even partial attempts, so the next report has something to work with.`
            : `You solved ${totals.solved} of ${totals.totalProblems} problems (${totals.completionRate}% completion) from ${plural(
                  totals.totalSubmissions,
                  "submission"
              )}, giving ${totals.submissionAccuracy}% submission accuracy and ${totals.problemAccuracy}% accuracy on problems you actually opened. ${
                  weakLabels.length > 0
                      ? `The unsolved problems were concentrated in ${list(weakLabels)}.`
                      : "The unsolved set does not cluster around any single topic."
              }`;

    const difficultyAnalysis = difficultyCeiling.highestSolvedRating
        ? `Your highest solved rating this contest was ${difficultyCeiling.highestSolvedRating}${
              difficultyCeiling.lowestUnsolvedRating
                  ? `, and the lowest rating you did not solve was ${difficultyCeiling.lowestUnsolvedRating}`
                  : ""
          }. ${
              difficultyCeiling.brokeCeiling
                  ? "That is above your current Codeforces rating, so the ceiling is moving in the right direction."
                  : "Closing the gap between those two numbers is the shortest path to a rating increase."
          }`
        : "No problem was solved, so there is not enough data to place your current difficulty ceiling. Start the next contest from the lowest-rated problem and work upwards.";

    const timeManagementAnalysis =
        timeManagement.solveTimeline.length === 0
            ? "No accepted solutions were recorded, so there is no pacing data for this contest."
            : `Your first solve landed at minute ${timeManagement.firstSolveMinute} and your last at minute ${
                  timeManagement.lastSolveMinute
              } of ${timeManagement.durationMinutes}. That leaves ${plural(
                  timeManagement.unusedMinutes,
                  "minute"
              )} unused after your final accepted submission${
                  timeManagement.unusedMinutes > timeManagement.durationMinutes * 0.3
                      ? " - a large tail, so either the remaining problems were out of reach or you stopped early."
                      : "."
              }`;

    const verdictAnalysis =
        totals.totalSubmissions === 0
            ? "No submissions were made, so there is no verdict pattern to read."
            : `${analytics.verdictBreakdown
                  .map((entry) => `${entry.label}: ${entry.count} (${entry.share}%)`)
                  .join(", ")}. ${dominantFailure?.diagnosis ?? "Accepted on the first try in most cases - keep that habit."}`;

    const recommendationList = [
        "Upsolve every unsolved problem from this contest before starting the next one.",
        ...recommendations.topics
            .slice(0, 3)
            .map((topic) => `Work through the suggested ${topic.label} ladder, starting from the lowest rating.`),
    ];

    if (dominantFailure?.diagnosis) recommendationList.push(dominantFailure.diagnosis);
    if (totals.untouched > 0) {
        recommendationList.push("Read every problem statement in the first ten minutes so nothing is left unopened.");
    }

    return {
        overallScore: totals.overallScore,
        headline:
            totals.solved === totals.totalProblems && totals.totalProblems > 0
                ? "Full clear - time to raise the difficulty"
                : totals.solved > 0
                  ? `Solved ${totals.solved} of ${totals.totalProblems}, with clear topics to fix`
                  : "No solves this round - upsolving is the next step",
        summary,
        strengths: strengths.slice(0, 4),
        weaknesses: weaknesses.slice(0, 4),
        difficultyAnalysis,
        timeManagementAnalysis,
        verdictAnalysis,
        topicAnalysis: analytics.topicBreakdown.map((topic) => ({
            tag: topic.tag,
            verdict: topic.solveRate === 100 ? "strong" : topic.solveRate >= 50 ? "developing" : "weak",
            comment:
                topic.solveRate === 100
                    ? `Solved all ${plural(topic.total, "problem")} tagged ${topic.label}.`
                    : `Solved ${topic.solved} of ${topic.total} ${topic.label} problems${
                          topic.wrongAttempts > 0 ? ` after ${plural(topic.wrongAttempts, "wrong submission")}` : ""
                      }.`,
        })),
        weakTopicPlan: recommendations.topics.map((topic) => ({
            tag: topic.tag,
            diagnosis: `${topic.stats.failed} attempted-but-unsolved and ${topic.stats.untouched} unopened ${topic.label} problems in this contest. ${topic.why}`,
            whatToLearn: topic.drills,
            practiceAdvice: `Solve the ladder below in rating order and read the editorial for anything you cannot finish in 45 minutes.`,
        })),
        problemAnalysis: analytics.problems.map((problem) => ({
            index: problem.index,
            name: problem.name,
            rating: problem.rating,
            comment:
                problem.status === "solved"
                    ? `Solved at minute ${problem.solvedAtMinute}${
                          problem.wrongAttempts > 0 ? ` after ${plural(problem.wrongAttempts, "wrong attempt")}` : " on the first accepted attempt"
                      }.`
                    : problem.status === "failed"
                      ? `${plural(problem.attempts, "submission")} without an accepted verdict (${
                            problem.verdicts.join(", ") || "no verdict"
                        }). Worth upsolving with the editorial.`
                      : problem.upsolvedAfterContest
                        ? "Not solved during the contest, but upsolved afterwards - good follow-through."
                        : `Never opened. Tags: ${problem.tags.join(", ") || "none"}.`,
        })),
        recommendations: recommendationList.slice(0, 6),
        nextContestGoals: [
            `Solve at least ${Math.min(totals.totalProblems, totals.solved + 1)} of ${totals.totalProblems} problems.`,
            "Open and read every problem within the first ten minutes.",
            analytics.weakTopics.length > 0
                ? `Convert at least one ${analytics.weakTopics[0].label} problem into an accepted solution.`
                : "Attempt a problem rated at least 200 above your current rating.",
        ],
        motivation:
            "Ratings move on the back of upsolving, not on contest day alone. Work the practice ladders below, keep the editorial open when you are stuck for more than 45 minutes, and enter the next contest with the same topics fresh in mind.",
        generatedBy: "offline-analyser",
    };
};

/* --------------------------------------------------- normalise model output */

const asArray = (value) => (Array.isArray(value) ? value : []);
const asString = (value, fallback = "") => (typeof value === "string" && value.trim() ? value.trim() : fallback);

const mergeNarrative = (aiNarrative, offlineNarrative) => {
    const merged = { ...offlineNarrative };

    merged.headline = asString(aiNarrative.headline, offlineNarrative.headline);
    merged.summary = asString(aiNarrative.summary, offlineNarrative.summary);
    merged.difficultyAnalysis = asString(aiNarrative.difficultyAnalysis, offlineNarrative.difficultyAnalysis);
    merged.timeManagementAnalysis = asString(
        aiNarrative.timeManagementAnalysis,
        offlineNarrative.timeManagementAnalysis
    );
    merged.verdictAnalysis = asString(aiNarrative.verdictAnalysis, offlineNarrative.verdictAnalysis);
    merged.motivation = asString(aiNarrative.motivation, offlineNarrative.motivation);

    const pick = (key) => (asArray(aiNarrative[key]).length > 0 ? aiNarrative[key] : offlineNarrative[key]);

    merged.strengths = pick("strengths");
    merged.weaknesses = pick("weaknesses");
    merged.recommendations = pick("recommendations");
    merged.nextContestGoals = pick("nextContestGoals");
    merged.topicAnalysis = pick("topicAnalysis");
    merged.weakTopicPlan = pick("weakTopicPlan");
    merged.problemAnalysis = pick("problemAnalysis");

    // The score is ours, never the model's.
    merged.overallScore = offlineNarrative.overallScore;
    merged.generatedBy = "gemini";

    return merged;
};

/* ------------------------------------------------------------------ public */

export const buildReport = async (analytics, recommendations) => {
    const offline = buildOfflineNarrative(analytics, recommendations);

    let narrative = offline;
    let aiError = null;

    if (isAiConfigured()) {
        try {
            const prompt = buildReportPrompt(analytics, recommendations);
            const aiNarrative = await generateJson(prompt);
            narrative = mergeNarrative(aiNarrative, offline);
        } catch (error) {
            console.error("AI narrative unavailable, using the offline analyser:", error.message);
            aiError = error.message;
        }
    }

    // Attach each topic's practice ladder to its plan entry so the UI has
    // everything it needs in one place.
    const planByTag = new Map(asArray(narrative.weakTopicPlan).map((entry) => [entry.tag, entry]));

    const weakTopicPlan = recommendations.topics.map((topic) => {
        const plan = planByTag.get(topic.tag) ?? {};

        return {
            tag: topic.tag,
            label: topic.label,
            why: topic.why,
            diagnosis: asString(
                plan.diagnosis,
                `${topic.stats.failed + topic.stats.untouched} of ${topic.stats.total} ${topic.label} problems went unsolved.`
            ),
            whatToLearn: asArray(plan.whatToLearn).length > 0 ? plan.whatToLearn : topic.drills,
            practiceAdvice: asString(
                plan.practiceAdvice,
                "Solve the ladder in rating order and read the editorial for anything you cannot finish in 45 minutes."
            ),
            stats: topic.stats,
            missedInContest: topic.missedInContest,
            practiceProblems: topic.practiceProblems,
            resources: topic.resources,
            problemsetUrl: topic.problemsetUrl,
        };
    });

    return {
        version: 2,
        generatedAt: new Date().toISOString(),
        generatedBy: narrative.generatedBy,
        aiError,

        // Narrative
        overallScore: narrative.overallScore,
        headline: narrative.headline,
        summary: narrative.summary,
        strengths: narrative.strengths,
        weaknesses: narrative.weaknesses,
        difficultyAnalysis: narrative.difficultyAnalysis,
        timeManagementAnalysis: narrative.timeManagementAnalysis,
        verdictAnalysis: narrative.verdictAnalysis,
        topicAnalysis: narrative.topicAnalysis,
        problemAnalysis: narrative.problemAnalysis,
        recommendations: narrative.recommendations,
        nextContestGoals: narrative.nextContestGoals,
        motivation: narrative.motivation,

        // Measured data
        contest: analytics.contest,
        user: analytics.user,
        stats: analytics.totals,
        problems: analytics.problems,
        topicBreakdown: analytics.topicBreakdown,
        strongTopics: analytics.strongTopics,
        ratingBreakdown: analytics.ratingBreakdown,
        difficultyCeiling: analytics.difficultyCeiling,
        verdictBreakdown: analytics.verdictBreakdown,
        timeManagement: analytics.timeManagement,
        languagesUsed: analytics.languagesUsed,

        // Practice plan
        weakTopicPlan,
        practiceTopics: weakTopicPlan.map((topic) => topic.label),
    };
};

export default buildReport;
