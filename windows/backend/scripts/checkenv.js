/*
 * Pre-flight check: verifies the .env file, the database and the cache before
 * you start debugging the app itself. Run with `npm run doctor`.
 */
import env, { assertEnv } from "../src/config/env.js";
import { pool } from "../src/config/db.js";
import connectCache, { cacheClient, disconnectCache } from "../src/config/cache.js";

const line = (label, value) => console.log(`  ${label.padEnd(22)} ${value}`);

const run = async () => {
    console.log("\nCP Contest Generator - environment check\n");

    assertEnv();
    line("Node", process.version);
    line("NODE_ENV", env.NODE_ENV);
    line("PORT", env.PORT);
    line("FRONTEND_URL", env.FRONTEND_URL);
    line("CORS_ORIGIN", env.CORS_ORIGIN.join(", "));
    line("Cookie SameSite", `${env.cookieSameSite} (secure=${env.cookieSecure})`);
    line("Gemini model", env.GEMINI_API_KEY ? env.GEMINI_MODEL : "not configured (offline fallback)");

    try {
        const { rows } = await pool.query("SELECT current_database() AS db, version() AS version");
        line("PostgreSQL", `OK - ${rows[0].db}`);
        line("Server version", rows[0].version.split(" ").slice(0, 2).join(" "));

        const { rows: tables } = await pool.query(
            `SELECT table_name FROM information_schema.tables
             WHERE table_schema = 'public' ORDER BY table_name`
        );
        line("Tables", tables.length ? tables.map((t) => t.table_name).join(", ") : "none - run npm run db:init");
    } catch (error) {
        line("PostgreSQL", `FAILED - ${error.message}`);
    }

    await connectCache();
    line("Cache backend", cacheClient.kind);

    await disconnectCache();
    await pool.end();
    console.log("\nDone.\n");
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
