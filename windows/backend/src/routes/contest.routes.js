import { Router } from "express";
import {
    endContest,
    generateContest,
    generateContestReport,
    generateTestContest,
    getContestHistory,
    getContestProblems,
    getContestReport,
} from "../controllers/contest.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

/*
 * The guard is applied per route rather than with router.use(). This router is
 * mounted at "/", so a router-level guard would also swallow every unmatched
 * path and answer 401 instead of letting the 404 handler run.
 */
router.post("/generate-contest", authMiddleware, generateContest);
router.post("/generate-test-contest", authMiddleware, generateTestContest);
router.get("/history", authMiddleware, getContestHistory);

router.get("/contest/:contestId", authMiddleware, getContestProblems);
router.patch("/contest/:contestId/end", authMiddleware, endContest);
router.get("/contest/:contestId/report", authMiddleware, getContestReport);
router.post("/contest/:contestId/report", authMiddleware, generateContestReport);

export default router;
