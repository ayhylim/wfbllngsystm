import express from "express";
import {OAuth2Client} from "google-auth-library";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// ========== GOOGLE LOGIN ==========
router.post(
    "/google",
    asyncHandler(async (req, res) => {
        const {credential} = req.body;

        if (!credential) {
            return res.status(400).json({error: "Google credential is required"});
        }

        try {
            // Verify Google token
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });

            const payload = ticket.getPayload();
            const googleId = payload.sub;
            const email = payload.email;
            const name = payload.name;
            const avatarUrl = payload.picture;

            console.log(`🔐 Google Login: ${email}`);

            // Check if user exists
            let user = await User.findOne({google_id: googleId});

            if (!user) {
                // Create new user
                user = new User({
                    email,
                    name,
                    google_id: googleId,
                    avatar_url: avatarUrl,
                    role: "operator", // default role
                    is_active: true,
                    last_login: new Date()
                });

                await user.save();
                console.log(`✅ New user created: ${email}`);
            } else {
                // Update last login
                user.last_login = new Date();
                if (avatarUrl) user.avatar_url = avatarUrl;
                await user.save();
                console.log(`✅ User logged in: ${email}`);
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user._id,
                    email: user.email,
                    role: user.role
                },
                JWT_SECRET,
                {expiresIn: JWT_EXPIRES_IN}
            );

            // Return user data + token
            res.json({
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar_url: user.avatar_url,
                    role: user.role,
                    company_name: user.company_name
                }
            });
        } catch (error) {
            console.error("❌ Google login error:", error);
            res.status(401).json({
                error: "Invalid Google token",
                details: error.message
            });
        }
    })
);

// ========== VERIFY TOKEN ==========
router.get(
    "/verify",
    asyncHandler(async (req, res) => {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({error: "No token provided"});
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId).select("-__v");

            if (!user || !user.is_active) {
                return res.status(401).json({error: "User not found or inactive"});
            }

            res.json({
                valid: true,
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    avatar_url: user.avatar_url,
                    role: user.role,
                    company_name: user.company_name
                }
            });
        } catch (error) {
            console.error("❌ Token verification error:", error);
            res.status(401).json({
                error: "Invalid token",
                details: error.message
            });
        }
    })
);

// ========== LOGOUT ==========
router.post("/logout", (req, res) => {
    // JWT is stateless, logout handled on frontend by removing token
    res.json({message: "Logged out successfully"});
});

export default router;
