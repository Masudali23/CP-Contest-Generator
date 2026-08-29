import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env.js";
import { pool } from "./config/db.js";
import { cacheClient } from "./config/cache.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";

import contestRouter from "./routes/contest.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";

const app = express();

/*
 * Render, Railway and Fly all sit behind a proxy. Without this Express reports
 * the proxy's IP and marks Secure cookies as unsafe.
 */
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

/*
 * The original config passed process.env.CORS_ORIGIN straight through. When
 * that variable was unset the origin became undefined, which the cors package
 * treats as "*" - and "*" with credentials:true is rejected by every browser.
 */
const allowedOrigins = env.CORS_ORIGIN;

app.use(
    cors({
        origin(origin, callback) {
            // Same-origin requests, curl and health checks send no Origin header.
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);

            // 403 rather than an unhandled 500: a blocked origin is a
            // configuration mismatch, not a server fault.
            const denied = new Error(
                `Origin ${origin} is not allowed by CORS. Add it to CORS_ORIGIN in backend/.env.`
            );
            denied.status = 403;
            return callback(denied);
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.get("/", (req, res) => {
    res.json({ service: "cp-contest-generator-api", status: "ok" });
});

/** Health probe for free hosting platforms and uptime pingers. */
app.get("/health", async (req, res) => {
    const health = { status: "ok", uptime: Math.round(process.uptime()), cache: cacheClient.kind, database: "unknown" };

    try {
        await pool.query("SELECT 1");
        health.database = "ok";
    } catch (error) {
        health.status = "degraded";
        health.database = `error: ${error.message}`;
    }

    res.status(health.status === "ok" ? 200 : 503).json(health);
});

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/", contestRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
