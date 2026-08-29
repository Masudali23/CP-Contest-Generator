/*
 * Creates / upgrades the schema using the pg driver instead of the psql CLI.
 * psql is not on PATH by default on Windows, and this keeps setup identical
 * on both platforms: `npm run db:init`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../src/config/env.js";
import { pool } from "../src/config/db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(here, "..", "src", "config", "init.sql");

const run = async () => {
    const sql = fs.readFileSync(sqlPath, "utf8");

    const client = await pool.connect();
    try {
        await client.query(sql);
        console.log("Schema created / updated successfully.");
    } finally {
        client.release();
        await pool.end();
    }
};

run().catch((error) => {
    console.error("Schema setup failed:", error.message);
    process.exit(1);
});
