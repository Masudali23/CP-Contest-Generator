import { pool } from "../config/index.js";

const createGoogleUserDb = async ({email, name, picture}) => {
    const query = `
        INSERT INTO users(email, name, picture)
        VALUES($1, $2, $3)
        RETURNING *
    `;
    const {rows} = await pool.query(query, [email, name, picture]);
    return rows[0];
}

const getUserByEmailDb = async (email) => {
    const query = `
        SELECT *
        FROM users
        WHERE email = $1
    `;
    const {rows} = await pool.query(query, [email]);
    return rows[0];
}

const getUserByIdDb = async (id) => {
    const query = `
        SELECT *
        FROM users
        WHERE id = $1;
    `;

    const { rows } = await pool.query(query, [id]);

    return rows[0];
};

const updateHandleDb = async ({id, handle, rating}) => {
    const query = `
        UPDATE users
        SET 
            handle = $1,
            rating = $2
        WHERE id = $3
        RETURNING *
    `;
    const {rows} = await pool.query(query, [handle, rating, id]);
    return rows[0];
}

const updateUserRatingDb = async ({id, rating}) => {
    const query = `
        UPDATE users
        SET rating = $1
        WHERE id = $2
        RETURNING *
    `;
    const {rows} = await pool.query(query, [rating, id]);
    return rows[0];
}

export {createGoogleUserDb, getUserByEmailDb, getUserByIdDb, updateHandleDb, updateUserRatingDb};