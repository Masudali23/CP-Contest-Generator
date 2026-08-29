import { pool } from "../config/db.js";

const createGoogleUserDb = async ({ email, name, picture }) => {
    /*
     * ON CONFLICT makes the sign-in path idempotent. Two callbacks racing for a
     * brand-new account used to hit the UNIQUE constraint on email and throw.
     */
    const query = `
        INSERT INTO users(email, name, picture)
        VALUES($1, $2, $3)
        ON CONFLICT (email) DO UPDATE
            SET name = EXCLUDED.name,
                picture = EXCLUDED.picture
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [email, name, picture]);
    return rows[0];
};

const getUserByEmailDb = async (email) => {
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1;`, [email]);
    return rows[0];
};

const getUserByIdDb = async (id) => {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1;`, [id]);
    return rows[0];
};

const getUserByHandleDb = async (handle) => {
    const { rows } = await pool.query(`SELECT * FROM users WHERE LOWER(handle) = LOWER($1);`, [handle]);
    return rows[0];
};

const updateHandleDb = async ({ id, handle, rating, maxRating, rank }) => {
    const query = `
        UPDATE users
        SET handle     = $1,
            rating     = $2,
            max_rating = $3,
            rank       = $4
        WHERE id = $5
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [handle, rating, maxRating, rank, id]);
    return rows[0];
};

const updateUserRatingDb = async ({ id, rating, maxRating, rank }) => {
    const query = `
        UPDATE users
        SET rating     = COALESCE($1, rating),
            max_rating = COALESCE($2, max_rating),
            rank       = COALESCE($3, rank)
        WHERE id = $4
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [rating ?? null, maxRating ?? null, rank ?? null, id]);
    return rows[0];
};

export { createGoogleUserDb, getUserByEmailDb, getUserByIdDb, getUserByHandleDb, updateHandleDb, updateUserRatingDb };
