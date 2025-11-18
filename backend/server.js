import express from "express";
import cors from "cors";
import "express-async-errors";
import dotenv from "dotenv";
import axios from "axios";
import {connectDB} from "./config/database.js";
import {errorHandler} from "./middleware/errorHandler.js";
import {authenticateToken} from "./middleware/auth.js";

// Routes
import authRouter from "./routes/auth.js";
import customersRouter from "./routes/customers.js";
import templatesRouter from "./routes/templates.js";
import invoicesRouter from "./routes/invoices.js";
import dashboardRouter from "./routes/dashboard.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:8002";

// Middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGINS?.split(",") || "*",
        credentials: true
    })
);

app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({limit: "50mb", extended: true}));

// ============================================
// BASIC ROUTES
// ============================================
app.get("/", (req, res) => {
    res.json({
        message: "WiFi Billing System - Backend API",
        version: "2.0.0",
        status: "running",
        auth: "Google OAuth enabled"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

// ============================================
// WHATSAPP PROXY ROUTES (NO AUTH REQUIRED)
// ============================================
console.log("📱 Setting up WhatsApp proxy routes...");

app.get("/api/whatsapp/status", async (req, res) => {
    try {
        const response = await axios.get(`${WHATSAPP_SERVICE_URL}/status`, {
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        console.error("❌ WhatsApp status error:", error.message);
        res.status(503).json({
            status: "service_down",
            connected: false,
            error: "WhatsApp service tidak merespons",
            details: error.message
        });
    }
});

app.get("/api/whatsapp/qr", async (req, res) => {
    try {
        const response = await axios.get(`${WHATSAPP_SERVICE_URL}/qr`, {
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        console.error("❌ WhatsApp QR error:", error.message);
        res.status(404).json({
            error: "QR code not available",
            details: error.message
        });
    }
});

app.post("/api/whatsapp/reconnect", async (req, res) => {
    try {
        const response = await axios.post(
            `${WHATSAPP_SERVICE_URL}/reconnect`,
            {},
            {
                timeout: 5000
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ WhatsApp reconnect error:", error.message);
        res.status(500).json({
            error: "Gagal reconnect WhatsApp",
            details: error.message
        });
    }
});

app.post("/api/whatsapp/logout", async (req, res) => {
    try {
        const response = await axios.post(
            `${WHATSAPP_SERVICE_URL}/logout`,
            {},
            {
                timeout: 5000
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ WhatsApp logout error:", error.message);
        res.status(500).json({
            error: "Gagal logout WhatsApp",
            details: error.message
        });
    }
});

console.log("✅ WhatsApp proxy routes registered!");

// ============================================
// AUTH ROUTES (NO AUTH REQUIRED)
// ============================================
app.use("/api/auth", authRouter);

// ============================================
// PROTECTED API ROUTES (AUTH REQUIRED)
// ============================================
app.use("/api/customers", authenticateToken, customersRouter);
app.use("/api/templates", authenticateToken, templatesRouter);
app.use("/api/invoices", authenticateToken, invoicesRouter);
app.use("/api/dashboard", authenticateToken, dashboardRouter);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.path,
        method: req.method
    });
});

// Connect to DB and start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`✅ Backend Server running on port ${PORT}`);
            console.log(`📍 API: http://localhost:${PORT}`);
            console.log(`🔐 Auth: Google OAuth enabled`);
            console.log(`📱 WhatsApp Service: ${WHATSAPP_SERVICE_URL}`);
            console.log(`🔗 CORS Origins: ${process.env.CORS_ORIGINS || "All origins"}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n⏹️  Shutting down server...");
    process.exit(0);
});

export default app;
