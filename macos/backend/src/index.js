import env, { assertEnv } from "./config/env.js";
import app from "./app.js";
import connectDB, { pool } from "./config/db.js";
import connectCache, { disconnectCache } from "./config/cache.js";

/*
 * env.js is imported first so process.env is populated before db.js and
 * cache.js read it. ES module imports are hoisted, so the original
 * dotenv.config() call in the middle of this file ran *after* the pool had
 * already been constructed with an undefined connection string.
 */

const startServer = async () => {
    assertEnv();

    await connectDB();
    await connectCache();

    const server = app.listen(env.PORT, () => {
        console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
        console.log(`Allowed CORS origins: ${env.CORS_ORIGIN.join(", ")}`);
    });

    const shutdown = async (signal) => {
        console.log(`\n${signal} received, shutting down.`);

        server.close(async () => {
            await disconnectCache();
            await pool.end();
            process.exit(0);
        });

        // Do not hang forever if a connection refuses to close.
        setTimeout(() => process.exit(1), 10_000).unref();
    };

    // SIGINT covers Ctrl+C on both PowerShell and Terminal.
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((error) => {
    console.error("Failed to start the server:", error);
    process.exit(1);
});
