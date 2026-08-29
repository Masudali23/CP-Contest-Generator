import { Router } from "express";
import { setupProfile, getTopics } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.post("/setup", authMiddleware, setupProfile);
router.get("/topics", getTopics);

export default router;
