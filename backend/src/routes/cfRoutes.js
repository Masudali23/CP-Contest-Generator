import {Router} from 'express';
import { endContest, generateContest, generateContestReport, generateTestContest, getContestHistory, getContestProblems, getContestReport } from '../controllers/contest.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.route('/generate-contest').post(authMiddleware, generateContest);
router.route('/generate-test-contest').post(authMiddleware, generateTestContest);
router.route('/contest/:contestId').get(authMiddleware, getContestProblems);
router.route('/contest/:contestId/end').patch(authMiddleware, endContest);
router.route('/contest/:contestId/report')
    .get(authMiddleware, getContestReport)
    .post(authMiddleware, generateContestReport);
router.route('/history').get(authMiddleware, getContestHistory);

export default router;