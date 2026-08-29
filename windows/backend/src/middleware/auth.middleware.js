import jwt from "jsonwebtoken";
import env from "../config/env.js";

const readToken = (req) => {
    if (req.cookies?.token) return req.cookies.token;

    // Bearer fallback for clients that cannot use third-party cookies.
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);

    return null;
};

const authMiddleware = (req, res, next) => {
    const token = readToken(req);

    if (!token) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        req.user = { id: decoded.id, email: decoded.email };
        return next();
    } catch {
        return res.status(401).json({ error: "Session expired, please sign in again" });
    }
};

export default authMiddleware;
