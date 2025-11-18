// backend/middleware/auth.js - UPDATED FOR MULTI-TENANCY
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";

// ========== VERIFY JWT TOKEN + ADD USER_ID TO REQUEST ==========
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

        // ⭐ CRITICAL: Attach user data to request for multi-tenancy
        req.user = {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        // ⭐ NEW: Add user_id to request for easy filtering
        req.userId = user._id.toString();

        next();
    } catch (error) {
        console.error("❌ Auth middleware error:", error);
        return res.status(403).json({
            error: "Invalid or expired token",
            details: error.message
        });
    }
};

// ========== MULTI-TENANT QUERY HELPER ==========
// Helper function to add user_id filter to all queries
export const getTenantFilter = req => {
    return {user_id: req.userId};
};

// Helper to add user_id to document before saving
export const addTenantData = (req, data) => {
    return {
        ...data,
        user_id: req.userId,
        created_by: req.user.email || "admin",
        updated_by: req.user.email || "admin"
    };
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
                req.userId = user._id.toString();
            }
        }
    } catch (error) {
        // Silently fail, user remains undefined
        console.log("Optional auth failed:", error.message);
    }

    next();
};
