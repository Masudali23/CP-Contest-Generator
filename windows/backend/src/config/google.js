import { google } from "googleapis";
import env from "./env.js";

/*
 * A fresh client per request. The original module exported one shared
 * OAuth2 client and called setCredentials() on it inside the callback,
 * so two users signing in at the same time could overwrite each other's
 * tokens and end up logged in as the wrong account.
 */
export const createOAuthClient = () =>
    new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
