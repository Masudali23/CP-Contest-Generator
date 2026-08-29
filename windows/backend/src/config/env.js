import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/*
 * Loads backend/.env regardless of the directory the process was started from.
 * The original code called dotenv.config({ path: "./.env" }) inside index.js,
 * which only worked when the server happened to be started from backend/.
 * Resolving from import.meta.url makes it identical on Windows and macOS.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "..", "..");

dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });

const asInt = (value, fallback) => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const asList = (value) =>
    (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

const env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: asInt(process.env.PORT, 8000),

    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_SSL: (process.env.DATABASE_SSL || "").toLowerCase() === "true",

    REDIS_URL: process.env.REDIS_URL || "",

    // Overridable so the suite can point at a stub, and so a self-hosted mirror
    // or proxy can be used where codeforces.com is blocked.
    CF_API_BASE: (process.env.CF_API_BASE || "https://codeforces.com/api").replace(/\/+$/, ""),

    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,

    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",

    FRONTEND_URL: (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, ""),
    CORS_ORIGIN: asList(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173"),

    COOKIE_SECURE: (process.env.COOKIE_SECURE || "").toLowerCase() === "true",
    COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || "",
};

env.isProduction = env.NODE_ENV === "production";

/*
 * Cross-site cookies (frontend on Vercel, API on Render) require
 * SameSite=None + Secure. Same-origin local dev works with Lax.
 */
env.cookieSameSite = env.COOKIE_SAMESITE || (env.isProduction ? "none" : "lax");
env.cookieSecure = env.COOKIE_SECURE || env.cookieSameSite === "none";

const REQUIRED = ["DATABASE_URL", "JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"];

export const assertEnv = () => {
    const missing = REQUIRED.filter((key) => !env[key]);

    if (missing.length > 0) {
        console.error(
            `\nMissing required environment variables: ${missing.join(", ")}\n` +
                `Copy backend/.env.example to backend/.env and fill these in.\n`
        );
        process.exit(1);
    }

    if (!env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is not set - AI reports will fall back to the offline analyser.");
    }
};

export default env;
