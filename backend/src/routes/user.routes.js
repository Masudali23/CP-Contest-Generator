import { Router } from "express";
import { setupProfile } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.route('/setup').post(authMiddleware, setupProfile);

export default router;