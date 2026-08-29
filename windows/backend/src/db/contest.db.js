import { pool } from "../config/db.js";

const createContestDb = async ({ user_id, duration, difficulty, tags = [], user_rating_at_start = null }) => {
    const query = `
        INSERT INTO contests(user_id, duration, difficulty, tags, user_rating_at_start)
        VALUES($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [user_id, duration, difficulty, tags, user_rating_at_start]);
    return rows[0];
};

const getContestByIdDb = async (contestId) => {
    const { rows } = await pool.query(`SELECT * FROM contests WHERE id = $1;`, [contestId]);
    return rows[0];
};

const endContestDb = async (contestId) => {
    const query = `
        UPDATE contests
        SET is_ended = TRUE,
            ended_at = COALESCE(ended_at, CURRENT_TIMESTAMP)
        WHERE id = $1
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [contestId]);
    return rows[0];
};

const getUserContestHistoryDb = async (user_id) => {
    /*
     * One query instead of N+1: each contest carries its problem count and
     * whether a report already exists, which the history and report list pages
     * both need.
     */
    const query = `
        SELECT c.*,
               COUNT(cp.id)::int                    AS problem_count,
               (r.id IS NOT NULL)                   AS has_report,
               r.generated_at                       AS report_generated_at
        FROM contests c
        LEFT JOIN contest_problems cp ON cp.contest_id = c.id
        LEFT JOIN contest_reports  r  ON r.contest_id  = c.id
        WHERE c.user_id = $1
        GROUP BY c.id, r.id, r.generated_at
        ORDER BY c.created_at DESC;
    `;
    const { rows } = await pool.query(query, [user_id]);
    return rows;
};

const createContestReportDb = async ({ contest_id, report }) => {
    /*
     * contest_reports.contest_id is UNIQUE, so a plain INSERT threw whenever a
     * report was regenerated. Upsert instead.
     */
    const query = `
        INSERT INTO contest_reports(contest_id, report)
        VALUES($1, $2)
        ON CONFLICT (contest_id) DO UPDATE
            SET report       = EXCLUDED.report,
                generated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [contest_id, report]);
    return rows[0];
};

const getContestReportByIdDb = async (contestId) => {
    const { rows } = await pool.query(`SELECT * FROM contest_reports WHERE contest_id = $1;`, [contestId]);
    return rows[0];
};

const deleteContestReportDb = async (contestId) => {
    await pool.query(`DELETE FROM contest_reports WHERE contest_id = $1;`, [contestId]);
};

export {
    createContestDb,
    getContestByIdDb,
    endContestDb,
    getUserContestHistoryDb,
    createContestReportDb,
    getContestReportByIdDb,
    deleteContestReportDb,
};
