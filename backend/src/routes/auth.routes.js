import { Router } from "express";
import { googleCallback, googleLogin, getMe, logoutUser } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.route('/google').get(googleLogin);
router.route('/google/callback').get(googleCallback);
router.route('/me').get(authMiddleware, getMe);
router.route('/logout').post(logoutUser);

export default router;