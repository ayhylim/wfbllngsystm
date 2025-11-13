import express from "express";
import cors from "cors";
import "express-async-errors";
import dotenv from "dotenv";
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

// Middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGINS?.split(",") || "*",
        credentials: true
    })
);

app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({limit: "50mb", extended: true}));

// Routes
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

// API Routes
app.use("/api/customers", customersRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/dashboard", dashboardRouter);

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
