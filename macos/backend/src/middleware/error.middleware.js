import env from "../config/env.js";
import { ApiError } from "../utils/asyncHandler.js";

export const notFound = (req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export const errorHandler = (error, req, res, next) => {
    const status = error instanceof ApiError ? error.status : error.status || 500;

    if (status >= 500) {
        console.error(`${req.method} ${req.originalUrl} failed:`, error);
    }

    res.status(status).json({
        error: error.message || "Internal server error",
        ...(error.details ? { details: error.details } : {}),
        ...(env.isProduction ? {} : { stack: error.stack }),
    });
};
