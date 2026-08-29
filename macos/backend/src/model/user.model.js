import {
    createGoogleUserDb,
    getUserByEmailDb,
    getUserByIdDb,
    getUserByHandleDb,
    updateHandleDb,
    updateUserRatingDb,
} from "../db/user.db.js";

/*
 * Thin pass-through layer. The original version wrapped every call in a
 * try/catch that replaced the real Postgres error with a generic string,
 * which made connection and constraint failures impossible to diagnose.
 * Errors now propagate to the central error handler, which logs them.
 */

export const createGoogleUser = (user) => createGoogleUserDb(user);
export const getUserByEmail = (email) => getUserByEmailDb(email);
export const getUserById = (id) => getUserByIdDb(id);
export const getUserByHandle = (handle) => getUserByHandleDb(handle);
export const updateHandle = (user) => updateHandleDb(user);
export const updateUserRating = (user) => updateUserRatingDb(user);
