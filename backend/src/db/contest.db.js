import { pool } from "../config/index.js";

const createContestDb = async ({user_id, duration, difficulty}) => {
    const query = `
        INSERT INTO contests(user_id, duration, difficulty)
        VALUES($1, $2, $3)
        RETURNING *;
    `;
    const {rows} = await pool.query(query, [user_id, duration, difficulty]);
    return rows[0];
}

const getContestByIdDb = async (contestId) => {
    const query = `
        SELECT *
        FROM contests
        WHERE id = $1;
    `;
    const {rows} = await pool.query(query, [contestId]);
    return rows[0];
}

const endContestDb = async (contestId) => {
    const query = `
        UPDATE contests
        SET 
            is_ended = TRUE,
            ended_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *;
    `;
    const {rows} = await pool.query(query, [contestId]);
    return rows[0];
}

const getUserContestHistoryDb = async (user_id) => {
    const query = `
        SELECT *
        FROM contests
        WHERE user_id = $1
        ORDER BY created_at DESC;
    `;
    const {rows} = await pool.query(query, [user_id]);
    return rows;
}

const createContestReportDb = async ({contest_id, report}) => {
    const query = `
        INSERT INTO contest_reports(contest_id, report)
        VALUES($1, $2)
        RETURNING *;
    `;

    const { rows } = await pool.query(query, [contest_id, report]);
    return rows[0];
};

const getContestReportByIdDb = async (contestId) => {
    const query = `
        SELECT *
        FROM contest_reports
        WHERE contest_id = $1;
    `;

    const { rows } = await pool.query(query, [contestId]);
    return rows[0];
};

export {createContestDb, getContestByIdDb, endContestDb, getUserContestHistoryDb, createContestReportDb, getContestReportByIdDb};