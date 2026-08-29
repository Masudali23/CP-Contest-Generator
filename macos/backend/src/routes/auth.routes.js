import { Router } from "express";
import { googleCallback, googleLogin, getMe, logoutUser } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = Router();

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/me", authMiddleware, getMe);
router.post("/logout", logoutUser);

export default router;
