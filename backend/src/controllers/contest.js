import axios from "axios";
import { getUserById, updateUserRating } from "../model/user.model.js";
import { createContest, createContestReport, endContestById, getContestById, getContestReportById, getUserContestHistory } from "../model/contest.model.js";
import { createContestProblems, getContestProblemsById } from "../model/contestProblems.model.js";
import { redisClient } from "../config/redis.js";
import { buildPrompt } from "../prompts/contestReportPrompt.js";
import { generateContent } from "../services/geminiService.js";
const PROBLEMSET_CACHE_KEY = "cf:problemset";
const PROBLEMSET_CACHE_TTL = 60 * 60 * 24;

const generateContest = async (req, res) => {
  const { tags = [], difficulty, duration } = req.body;
  try {
    const dbUser = await getUserById(req.user.id);
    if (!dbUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    const handle = dbUser.handle;

    const userRes = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
    const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${handle}`);

    let problems;
    try {
      const cachedProblems = await redisClient.get(PROBLEMSET_CACHE_KEY);
      if(cachedProblems) {
        problems = JSON.parse(cachedProblems);
        // console.log("Using cached problems");
      }
      else {
        // console.log("Fetching from cf");
        const problemsRes = await axios.get("https://codeforces.com/api/problemset.problems");
        problems = problemsRes.data.result.problems;
        await redisClient.set(PROBLEMSET_CACHE_KEY, JSON.stringify(problems), "EX", PROBLEMSET_CACHE_TTL);
      }
    } catch (error) {
      console.error("Redis error:", err.message);
      const problemsRes = await axios.get("https://codeforces.com/api/problemset.problems");
      problems = problemsRes.data.result.problems;
    }

    const user = userRes.data.result[0];
    const submissions = statusRes.data.result;

    const solved = new Set();

    for (const sub of submissions) {
      if (sub.verdict === "OK") {
        solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    }

    let userRating = user.rating || 1000;

    if (dbUser.rating !== userRating) {
      await updateUserRating({
        id: dbUser.id, 
        rating: user.rating
      });
    }

    let targetRatings;

    if (difficulty === "easy") {
      targetRatings = [
        userRating - 300,
        userRating - 200,
        userRating - 100,
        userRating,
      ];
    } else if (difficulty === "hard") {
      targetRatings = [
        userRating,
        userRating + 100,
        userRating + 200,
        userRating + 300,
        userRating + 400,
      ];
    } else {
      targetRatings = [
        userRating - 200,
        userRating - 100,
        userRating,
        userRating + 100,
        userRating + 200,
      ];
    }

    const selectedProblems = [];

    for (const target of targetRatings) {
      const candidates = problems.filter((problem) => {
        const key = `${problem.contestId}-${problem.index}`;

        const tagMatch =
          tags.length === 0 || problem.tags.some((tag) => tags.includes(tag));

        return (
          !solved.has(key) &&
          problem.rating &&
          Math.abs(problem.rating - target) <= 100 &&
          tagMatch
        );
      });

      if (candidates.length === 0) {
        continue;
      }

      const idx = Math.floor(Math.random() * candidates.length);

      selectedProblems.push(candidates[idx]);
    }

    const contest = await createContest({
      user_id: dbUser.id,
      duration,
      difficulty,
    });

    for(let i = 0; i < selectedProblems.length; i++) {
        const problem = selectedProblems[i];
        await createContestProblems({
            contest_id: contest.id,
            contest_id_cf: problem.contestId,
            problem_index: problem.index,
            problem_name: problem.name,
            rating: problem.rating,
            position: i + 1,
        });
    }

    return res.status(200).json({
      contestId: contest.id
    })


  } catch (err) {
    return res.status(500).json({
      error: "Failed to generate contest",
    });
  }
};

const generateTestContest = async (req, res) => {
  const { duration } = req.body;

  try {
    const dbUser = await getUserById(req.user.id);
    if (!dbUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    const handle = dbUser.handle;

    const statusRes = await axios.get(
      `https://codeforces.com/api/user.status?handle=${handle}`
    );

    let problems;
    try {
      const cachedProblems = await redisClient.get(PROBLEMSET_CACHE_KEY);
      if(cachedProblems) {
        problems = JSON.parse(cachedProblems);
        // console.log("Using cached problems");
      }
      else {
        // console.log("Fetching from cf");
        const problemsRes = await axios.get("https://codeforces.com/api/problemset.problems");
        problems = problemsRes.data.result.problems;
        await redisClient.set(PROBLEMSET_CACHE_KEY, JSON.stringify(problems), "EX", PROBLEMSET_CACHE_TTL);
      }
    } catch (error) {
      console.error("Redis error:", err.message);
      const problemsRes = await axios.get("https://codeforces.com/api/problemset.problems");
      problems = problemsRes.data.result.problems;
    }

    const submissions = statusRes.data.result;
  
    const solved = new Set();

    for (const sub of submissions) {
      if (sub.verdict === "OK") {
        solved.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    }

    const targetRatings = [800, 800, 800, 900, 900, 1000];

    const selectedProblems = [];
    const used = new Set();

    for (const target of targetRatings) {
      const candidates = problems.filter((problem) => {
        const key = `${problem.contestId}-${problem.index}`;

        return (
          !solved.has(key) &&
          !used.has(key) &&
          problem.rating === target
        );
      });

      if (candidates.length === 0) continue;

      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)];

      selectedProblems.push(chosen);
      used.add(`${chosen.contestId}-${chosen.index}`);
    }

    const contest = await createContest({
      user_id: dbUser.id,
      duration,
      difficulty: "easy"
    });

    for(let i = 0; i < selectedProblems.length; i++) {
        const problem = selectedProblems[i];
        await createContestProblems({
            contest_id: contest.id,
            contest_id_cf: problem.contestId,
            problem_index: problem.index,
            problem_name: problem.name,
            rating: problem.rating,
            position: i + 1,
        });
    }
    return res.status(200).json({
      contestId: contest.id,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({  
      error: "Failed to generate test contest",
    });
  }
};

const getContestProblems = async (req, res) => {
    const {contestId} = req.params;  
    try {
      const contest = await getContestById(contestId);
      if (!contest) {
          return res.status(404).json({
              error: "Contest not found",
          });
      }
      if (contest.user_id !== req.user.id) {
          return res.status(403).json({
              error: "Unauthorized",
          });
      }
      const problems = await getContestProblemsById(contestId);
      const duration = contest.duration;
      const createdAt = contest.created_at;
    
      const endTime = new Date(createdAt).getTime() + duration * 60 * 1000;
      if (!contest.is_ended && Date.now() >= endTime) {
          await endContestById(contestId);
          contest.is_ended = true;
      }

      const user = await getUserById(req.user.id);
      const USER_STATUS_CACHE_KEY = `cf:userstatus:${user.handle}`;
      const USER_STATUS_CACHE_TTL = 60 * 3;

      let submissions;
      try {
        const cachedStatus = await redisClient.get(USER_STATUS_CACHE_KEY);
        if(cachedStatus) {
          submissions = JSON.parse(cachedStatus);
          // console.log("cached problems");
        }
        else {
          // console.log("cf problems");
          const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${user.handle}`);
          submissions = statusRes.data.result;
          await redisClient.set(USER_STATUS_CACHE_KEY, JSON.stringify(submissions), "EX", USER_STATUS_CACHE_TTL);
        }
      } catch (err) {
        console.error("Redis error:", err.message);
        const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${user.handle}`);
        submissions = statusRes.data.result;
      }

      const solved = new Set();
      const attempted = new Set();

      for(const sub of submissions){
          const key = `${sub.problem.contestId}-${sub.problem.index}`;
          attempted.add(key);
          if(sub.verdict === "OK"){
              solved.add(key);
          }
      }

      const progress = problems.map(problem => {
            const key = `${problem.contest_id_cf}-${problem.problem_index}`
            let status = "pending";
            if (solved.has(key)) {
                status = "solved";
            } else if (attempted.has(key)) {
                status = "wrong";
            }
            else {
                status = "pending";
            }
            return {...problem, status};
        });
      
      return res.status(200).json({problems: progress, duration, createdAt, isEnded: contest.is_ended});
    } catch (error) {
      return res.status(500).json({
        error: "Failed to get problems",
      });
    }
}

const endContest = async (req, res) => {
    const {contestId} = req.params;
    try {
        const contest = await getContestById(contestId);
        if (!contest) {
            return res.status(404).json({
                error: "Contest not found",
            });
        }
        if (contest.user_id !== req.user.id) {
            return res.status(403).json({
                error: "Unauthorized",
            });
        }
        if (contest.is_ended) {
            return res.status(200).json({
                message: "Contest already ended",
            });
        }

        await endContestById(contestId);

        return res.status(200).json({
            message: "Contest ended successfully"
        });
    } catch (error) {
        return res.status(500).json({
            error: "Failed to end contest"
        });
    }
}

const getContestHistory = async (req, res) => {
    try {
      const userId = req.user.id;
      const history = await getUserContestHistory(userId);
      res.json({contests: history});
    } catch (error) {
        return res.status(500).json({
            error: "Failed to fetch contest history"
        });
    }
}

const generateContestReport = async (req, res) => {
    const { contestId } = req.params;
    const userId = 1;
    try {
        const contest = await getContestById(contestId);
        if (!contest) {
            return res.status(404).json({
                error: "Contest not found",
            });
        }
        if (contest.user_id !== req.user.id) {
            return res.status(403).json({
                error: "Unauthorized",
            });
        }

        const existingReport = await getContestReportById(contestId);
        if (existingReport) {
            return res.status(200).json({
                report: existingReport.report,
            });
        }

        const problems = await getContestProblemsById(contestId);

        const user = await getUserById(req.user.id);
        // const user = await getUserById(userId);
        const USER_STATUS_CACHE_KEY = `cf:userstatus:${user.handle}`;
        const USER_STATUS_CACHE_TTL = 60 * 3;

        let submissions;

        try {
            const cachedStatus = await redisClient.get(USER_STATUS_CACHE_KEY);
            if (cachedStatus) {
                submissions = JSON.parse(cachedStatus);
            } else {
                const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${user.handle}`);
                submissions = statusRes.data.result;
                await redisClient.set(
                    USER_STATUS_CACHE_KEY,
                    JSON.stringify(submissions),
                    "EX",
                    USER_STATUS_CACHE_TTL
                );
            }
        } catch (err) {
            console.error("Redis error:", err.message);
            const statusRes = await axios.get(`https://codeforces.com/api/user.status?handle=${user.handle}`);
            submissions = statusRes.data.result;
        }

        const solvedSet = new Set();
        const attemptedSet = new Set();

        for (const sub of submissions) {
            const key = `${sub.problem.contestId}-${sub.problem.index}`;

            attemptedSet.add(key);

            if (sub.verdict === "OK") {
                solvedSet.add(key);
            }
        }

        const progress = problems.map(problem => {
            const key = `${problem.contest_id_cf}-${problem.problem_index}`;

            let status = "pending";

            if (solvedSet.has(key)) {
                status = "solved";
            } else if (attemptedSet.has(key)) {
                status = "wrong";
            }

            return {
                ...problem,
                status,
            };
        });

        let solved = 0;
        let wrong = 0;
        let pending = 0;

        const solvedProblems = [];
        const unsolvedProblems = [];

        for (const problem of progress) {

            if (problem.status === "solved") {
                solved++;

                solvedProblems.push({
                    name: problem.problem_name,
                    rating: problem.rating,
                    index: problem.problem_index,
                });
            }

            else if (problem.status === "wrong") {
                wrong++;

                unsolvedProblems.push({
                    name: problem.problem_name,
                    rating: problem.rating,
                    index: problem.problem_index,
                });
            }

            else {
                pending++;

                unsolvedProblems.push({
                    name: problem.problem_name,
                    rating: problem.rating,
                    index: problem.problem_index,
                });
            }
        }

        const attempted = solved + wrong;

        const accuracy =
            attempted === 0
                ? 0
                : Math.round((solved * 100) / attempted);

        const contestData = {
            duration: contest.duration,
            difficulty: contest.difficulty,

            totalProblems: progress.length,

            solved,
            attempted,
            pending,
            accuracy,

            solvedProblems,
            unsolvedProblems,
        };

        const prompt =  buildPrompt(contestData);
        const rawReport = await generateContent(prompt);
        
        let parsedReport;

        try {
            parsedReport = JSON.parse(rawReport);
        }
        catch(err){
            // console.error(rawReport);
            return res.status(500).json({
                error:"Invalid AI response"
            });
        }

        await createContestReport({
            contest_id: contestId,
            report: parsedReport,
        });

        return res.status(200).json({
            report: parsedReport 
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Failed to generate report",
            message: error.message,
        });
    }
};

const getContestReport = async (req, res) => {
    const { contestId } = req.params;

    try {
        const contest = await getContestById(contestId);
        if (!contest) {
            return res.status(404).json({
                error: "Contest not found",
            });
        }
        if (contest.user_id !== req.user.id) {
            return res.status(403).json({
                error: "Unauthorized",
            });
        }
        const report = await getContestReportById(contestId);
        if (!report) {
            return res.status(404).json({
                error: "Report not found",
            });
        }
        return res.status(200).json({
            report: report.report,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            error: "Failed to fetch report",
        });
    }
};

export { generateContest, generateTestContest, getContestProblems, endContest, getContestHistory, generateContestReport, getContestReport };
