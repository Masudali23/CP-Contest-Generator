/*
 * Wraps an async route handler so a rejected promise reaches the Express error
 * middleware instead of hanging the request.
 */
export const asyncHandler = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export class ApiError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

export default asyncHandler;
