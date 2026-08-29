import { google } from "googleapis";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { createOAuthClient } from "../config/google.js";
import { createGoogleUser, getUserByEmail } from "../model/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cookieOptions = () => ({
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    path: "/",
});

const googleLogin = asyncHandler(async (req, res) => {
    const url = createOAuthClient().generateAuthUrl({
        access_type: "offline",
        prompt: "select_account",
        scope: ["openid", "profile", "email"],
    });

    res.redirect(url);
});

const googleCallback = asyncHandler(async (req, res) => {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
        return res.redirect(`${env.FRONTEND_URL}/?error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
        return res.redirect(`${env.FRONTEND_URL}/?error=missing_code`);
    }

    try {
        // One client per request: the shared module-level client used before
        // could hand user A's tokens to user B under concurrent sign-ins.
        const oauth2Client = createOAuthClient();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
        const { data } = await oauth2.userinfo.get();

        if (!data.email) {
            return res.redirect(`${env.FRONTEND_URL}/?error=no_email`);
        }

        let user = await getUserByEmail(data.email);

        if (!user) {
            user = await createGoogleUser({
                email: data.email,
                name: data.name || data.email.split("@")[0],
                picture: data.picture,
            });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
            expiresIn: env.JWT_EXPIRES_IN,
        });

        res.cookie("token", token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });

        // Lowercase to match the router paths exactly.
        return res.redirect(user.handle ? `${env.FRONTEND_URL}/landingpage` : `${env.FRONTEND_URL}/setup`);
    } catch (error) {
        console.error("Google sign-in failed:", error.message);
        return res.redirect(`${env.FRONTEND_URL}/?error=google_login_failed`);
    }
});

const getMe = asyncHandler(async (req, res) => {
    const user = await getUserByEmail(req.user.email);

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        handle: user.handle,
        rating: user.rating,
        maxRating: user.max_rating,
        rank: user.rank,
        createdAt: user.created_at,
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    // clearCookie only works when the options match the ones used to set it.
    res.clearCookie("token", cookieOptions());
    res.status(200).json({ message: "Logged out successfully" });
});

export { googleLogin, googleCallback, getMe, logoutUser };
