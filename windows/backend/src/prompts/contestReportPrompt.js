/*
 * Prompt for the narrative half of the report.
 *
 * Every number the user sees is computed in contestAnalytics.service.js and
 * every recommended problem comes from the real Codeforces problemset. The
 * model is asked only for coaching prose on top of that data, and is explicitly
 * forbidden from inventing problems or contradicting the statistics.
 */

const compactTopic = (topic) => ({
    tag: topic.tag,
    label: topic.label,
    problemsInContest: topic.total,
    solved: topic.solved,
    failedAfterAttempting: topic.failed,
    neverOpened: topic.untouched,
    wrongSubmissions: topic.wrongAttempts,
    solveRatePercent: topic.solveRate,
    averageRating: topic.averageRating,
});

export const buildReportPrompt = (analytics, recommendations) => {
    const payload = {
        contest: analytics.contest,
        user: analytics.user,
        totals: analytics.totals,
        problems: analytics.problems.map((problem) => ({
            index: problem.index,
            name: problem.name,
            rating: problem.rating,
            tags: problem.tags,
            status: problem.status,
            submissionsDuringContest: problem.attempts,
            wrongAttempts: problem.wrongAttempts,
            verdicts: problem.verdicts,
            solvedAtMinute: problem.solvedAtMinute,
            firstAttemptMinute: problem.firstAttemptMinute,
            upsolvedAfterContest: problem.upsolvedAfterContest,
        })),
        topicBreakdown: analytics.topicBreakdown.map(compactTopic),
        weakTopics: analytics.weakTopics.map(compactTopic),
        strongTopics: analytics.strongTopics.map(compactTopic),
        ratingBreakdown: analytics.ratingBreakdown,
        difficultyCeiling: analytics.difficultyCeiling,
        verdictBreakdown: analytics.verdictBreakdown,
        timeManagement: analytics.timeManagement,
        languagesUsed: analytics.languagesUsed,
        weakTopicsWithSuggestedPractice: recommendations.topics.map((topic) => ({
            tag: topic.tag,
            label: topic.label,
            missedInContest: topic.missedInContest.map((problem) => problem.name),
            suggestedPracticeProblems: topic.practiceProblems.map((problem) => ({
                name: problem.name,
                rating: problem.rating,
            })),
        })),
    };

    return `You are an experienced Codeforces coach writing a post-contest debrief for one student.

Every number below was measured from the student's real Codeforces submissions. Treat it as ground truth.

CONTEST DATA
${JSON.stringify(payload, null, 2)}

TASK
Write the narrative half of a performance report. Return ONLY a JSON object - no markdown, no code fences, no commentary outside the JSON.

Required structure (use these exact keys):

{
  "overallScore": ${analytics.totals.overallScore},
  "headline": "<8-14 word verdict on this contest>",
  "summary": "<70-110 words: what happened, grounded in the numbers above>",
  "strengths": ["<3-4 specific strengths, each citing a number or problem from the data>"],
  "weaknesses": ["<3-4 specific weaknesses, each citing a number or problem from the data>"],
  "difficultyAnalysis": "<70-110 words comparing solved vs unsolved ratings and where the ceiling currently sits>",
  "timeManagementAnalysis": "<60-90 words on pacing: solve timeline, unused minutes, wasted attempts. Say 'not enough submission data' if there were no submissions>",
  "verdictAnalysis": "<50-80 words on what the verdict mix says about the failure mode: wrong idea vs wrong complexity vs sloppy implementation. Say 'no submissions were made' if totalSubmissions is 0>",
  "topicAnalysis": [
    {
      "tag": "<exact tag string from topicBreakdown>",
      "verdict": "strong" | "developing" | "weak",
      "comment": "<1-2 sentences on how the student handled this topic in THIS contest>"
    }
  ],
  "weakTopicPlan": [
    {
      "tag": "<exact tag string that appears in weakTopicsWithSuggestedPractice>",
      "diagnosis": "<1-2 sentences on what specifically went wrong with this topic here>",
      "whatToLearn": ["<2-3 concrete sub-skills to study for this topic>"],
      "practiceAdvice": "<1-2 sentences on how to work through the suggested problems for this topic>"
    }
  ],
  "problemAnalysis": [
    {
      "index": "<problem index exactly as given>",
      "name": "<problem name exactly as given>",
      "rating": <rating or null>,
      "comment": "<1-2 sentences: what this problem tested and what to do about it>"
    }
  ],
  "recommendations": ["<4-6 concrete, actionable next steps>"],
  "nextContestGoals": ["<3 measurable goals for the next contest, e.g. 'solve at least 3 of 5' >"],
  "motivation": "<40-60 word encouraging close, honest rather than flattering>"
}

RULES
- overallScore MUST be exactly ${analytics.totals.overallScore}. Do not recompute it.
- topicAnalysis MUST cover every tag in topicBreakdown, using the exact tag strings.
- weakTopicPlan MUST cover every tag in weakTopicsWithSuggestedPractice, using the exact tag strings. If that list is empty, return an empty array.
- problemAnalysis MUST cover every problem in the problems array, using the exact index and name.
- Never invent problem names, ratings, contests or statistics. Reference only what is above.
- Do not comment on coding style, confidence or debugging skill unless the verdict and timing data support it.
- If the student made no submissions, say so plainly instead of guessing why.
- Be specific and practical. Prefer "you spent 4 wrong submissions on C before solving it at minute 71" over generic advice.
- Return valid JSON only.`;
};

export const buildPrompt = buildReportPrompt;
export default buildReportPrompt;
