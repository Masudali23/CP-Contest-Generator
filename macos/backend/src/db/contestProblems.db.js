import { pool } from "../config/db.js";

/*
 * Bulk insert in a single statement. The original code awaited one INSERT per
 * problem inside a loop, so a failure halfway through left a contest with a
 * partial problem set.
 */
const createContestProblemsDb = async (problems) => {
    if (problems.length === 0) return [];

    const columns = ["contest_id", "contest_id_cf", "problem_index", "problem_name", "rating", "tags", "position"];

    const values = [];
    const placeholders = problems.map((problem, row) => {
        const offset = row * columns.length;
        values.push(
            problem.contest_id,
            problem.contest_id_cf,
            problem.problem_index,
            problem.problem_name,
            problem.rating ?? null,
            problem.tags ?? [],
            problem.position
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    });

    const query = `
        INSERT INTO contest_problems(${columns.join(", ")})
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (contest_id, contest_id_cf, problem_index) DO NOTHING
        RETURNING *;
    `;

    const { rows } = await pool.query(query, values);
    return rows;
};

const getContestProblemsDb = async (contestId) => {
    const { rows } = await pool.query(
        `SELECT * FROM contest_problems WHERE contest_id = $1 ORDER BY position;`,
        [contestId]
    );
    return rows;
};

export { createContestProblemsDb, getContestProblemsDb };
