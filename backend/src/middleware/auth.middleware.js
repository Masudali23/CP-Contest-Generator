import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({
                error: "Unauthorized",
            });
        }
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        req.user = {
            id: decoded.id,
            email: decoded.email,
        };
        next();
    } catch (error) {
        return res.status(401).json({
            error: "Invalid Token",
        });
    }
};

export default authMiddleware;