export const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err);

    // Mongoose validation error
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            error: "Validation Error",
            details: messages
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            error: `${field} sudah terdaftar`,
            details: `${field} tidak boleh duplikat`
        });
    }

    // Mongoose cast error
    if (err.name === "CastError") {
        return res.status(400).json({
            error: "Invalid ID format",
            details: err.message
        });
    }

    // Default error
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
        error: message,
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
};

export const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
