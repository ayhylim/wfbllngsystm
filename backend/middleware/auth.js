import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// ========== VERIFY JWT TOKEN ==========
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({error: "Access token required"});
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Get user from database
        const user = await User.findById(decoded.userId).select("-__v");

        if (!user || !user.is_active) {
            return res.status(401).json({error: "User not found or inactive"});
        }

        // Attach user to request
        req.user = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        next();
    } catch (error) {
        console.error("❌ Auth middleware error:", error);
        return res.status(403).json({
            error: "Invalid or expired token",
            details: error.message
        });
    }
};

// ========== ROLE-BASED ACCESS ==========
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({error: "Authentication required"});
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: "Insufficient permissions",
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

// ========== OPTIONAL AUTH (allow both authenticated & anonymous) ==========
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1];

        if (token) {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId).select("-__v");

            if (user && user.is_active) {
                req.user = {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                };
            }
        }
    } catch (error) {
        // Silently fail, user remains undefined
        console.log("Optional auth failed:", error.message);
    }

    next();
};
