import pg from "pg";
import env from "./env.js";

const { Pool } = pg;

/*
 * TLS.
 *
 * When DATABASE_URL carries an `sslmode=` parameter, pg parses it and that
 * setting wins outright - anything passed as `ssl` here is ignored. So for a
 * Neon/Supabase URL ending in `?sslmode=require`, the certificate is fully
 * verified and none of the logic below applies.
 *
 * The `ssl` option only takes effect when the URL has no `sslmode`, i.e. when
 * TLS was requested through DATABASE_SSL=true. Verify the certificate there
 * too: Neon, Supabase, Render and Aiven all present publicly trusted chains.
 * DATABASE_SSL_INSECURE=true is the escape hatch for a self-signed server, and
 * it warns loudly, because it disables the check that stops an attacker
 * impersonating your database.
 */
const urlHasSslMode = /[?&]sslmode=/.test(env.DATABASE_URL || "");
const needsSsl = env.DATABASE_SSL || urlHasSslMode;

if (env.DATABASE_SSL_INSECURE) {
    console.warn(
        "DATABASE_SSL_INSECURE=true - the database certificate will NOT be verified. Use this only for a self-signed server you control."
    );
}

const sslConfig = needsSsl ? (env.DATABASE_SSL_INSECURE ? { rejectUnauthorized: false } : true) : false;

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.message);
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query("SELECT current_database()");
        console.log(`PostgreSQL connected. Database: ${result.rows[0].current_database}`);
        client.release();
    } catch (error) {
        console.error("PostgreSQL connection error:", error.message);
        console.error("Check DATABASE_URL in backend/.env and make sure the server is running.");
        process.exit(1);
    }
};

export { pool };
export default connectDB;
