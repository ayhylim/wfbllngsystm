import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error("MONGODB_URI tidak ditemukan di .env");
        }

        await mongoose.connect(mongoUri, {
            dbName: process.env.DB_NAME || "wifiangkasa_db"
        });

        console.log("✅ MongoDB Connected Successfully");
        console.log(`📊 Database: ${process.env.DB_NAME}`);

        return mongoose.connection;
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error.message);
        process.exit(1);
    }
};

export const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("✅ MongoDB Disconnected");
    } catch (error) {
        console.error("❌ MongoDB Disconnect Error:", error);
    }
};
