import express from "express";
import cors from "cors";
import "express-async-errors";
import dotenv from "dotenv";
import axios from "axios"; // ← PENTING! IMPORT INI!
import {connectDB} from "./config/database.js";
import {errorHandler} from "./middleware/errorHandler.js";

// Routes
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
        version: "1.0.0",
        status: "running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});

// ============================================
// WHATSAPP PROXY ROUTES (TAMBAHKAN SEBELUM API ROUTES LAIN!)
// ============================================
console.log("📱 Setting up WhatsApp proxy routes...");

app.get("/api/whatsapp/status", async (req, res) => {
    try {
        console.log(`🔵 Proxying: GET ${WHATSAPP_SERVICE_URL}/status`);
        const response = await axios.get(`${WHATSAPP_SERVICE_URL}/status`, {
            timeout: 5000
        });
        console.log("✅ WhatsApp status response:", response.data);
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
        console.log(`🔵 Proxying: GET ${WHATSAPP_SERVICE_URL}/qr`);
        const response = await axios.get(`${WHATSAPP_SERVICE_URL}/qr`, {
            timeout: 5000
        });
        console.log("✅ WhatsApp QR response received");
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
        console.log(`🔵 Proxying: POST ${WHATSAPP_SERVICE_URL}/reconnect`);
        const response = await axios.post(
            `${WHATSAPP_SERVICE_URL}/reconnect`,
            {},
            {
                timeout: 5000
            }
        );
        console.log("✅ WhatsApp reconnect response:", response.data);
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
        console.log(`🔵 Proxying: POST ${WHATSAPP_SERVICE_URL}/logout`);
        const response = await axios.post(
            `${WHATSAPP_SERVICE_URL}/logout`,
            {},
            {
                timeout: 5000
            }
        );
        console.log("✅ WhatsApp logout response:", response.data);
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
// API ROUTES (SETELAH WHATSAPP ROUTES!)
// ============================================
app.use("/api/customers", customersRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/dashboard", dashboardRouter);

// Error handling middleware
app.use(errorHandler);

// 404 handler (PALING AKHIR!)
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
