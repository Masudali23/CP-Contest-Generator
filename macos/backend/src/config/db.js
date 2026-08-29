import pg from "pg";
import env from "./env.js";

const { Pool } = pg;

/*
 * Managed Postgres (Neon, Supabase, Render) terminates TLS with a certificate
 * chain Node does not ship, so rejectUnauthorized has to be relaxed there.
 * Local Postgres on Windows/macOS runs without SSL.
 */
const needsSsl = env.DATABASE_SSL || /\bsslmode=require\b/.test(env.DATABASE_URL || "");

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
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
