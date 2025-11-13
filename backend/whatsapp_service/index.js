import express from "express";
import cors from "cors";
import multer from "multer";
import {Boom} from "@hapi/boom";
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({dest: "uploads/"});

app.use(cors());
app.use(express.json());

let sock = null;
let qrCodeData = null;
let isConnected = false;
let connectionStatus = "disconnected";

const logger = pino({level: "silent"});

async function connectToWhatsApp() {
    const {state, saveCreds} = await useMultiFileAuthState("./auth_info_baileys");
    const {version} = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        getMessage: async key => {
            return {conversation: ""};
        }
    });

    sock.ev.on("connection.update", async update => {
        const {connection, lastDisconnect, qr} = update;

        if (qr) {
            qrCodeData = qr;
            connectionStatus = "qr_ready";
            console.log("QR Code generated, scan via /qr endpoint");
            qrcode.generate(qr, {small: true});
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error instanceof Boom
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;

            isConnected = false;
            connectionStatus = "disconnected";
            console.log("Connection closed. Reconnecting:", shouldReconnect);

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(), 3000);
            }
        } else if (connection === "open") {
            isConnected = true;
            connectionStatus = "connected";
            qrCodeData = null;
            console.log("WhatsApp connected successfully!");
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

// Health check
app.get("/status", (req, res) => {
    res.json({
        status: connectionStatus,
        connected: isConnected,
        qr_available: !!qrCodeData,
        phone: sock?.user?.id ? sock.user.id.split("@")[0] : null
    });
});

// Get QR Code
app.get("/qr", (req, res) => {
    if (!qrCodeData) {
        return res.status(404).json({error: "QR code not available. Try reconnecting."});
    }
    res.json({qr: qrCodeData});
});

// Send text message
app.post("/send-message", async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(503).json({error: "WhatsApp not connected", status: connectionStatus});
        }

        const {phone, message} = req.body;
        if (!phone || !message) {
            return res.status(400).json({error: "Phone and message are required"});
        }

        // Format phone number (remove + and add @s.whatsapp.net)
        const jid = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

        await sock.sendMessage(jid, {text: message});

        res.json({success: true, message: "Message sent successfully"});
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({error: error.message});
    }
});

// Send document (PDF)
app.post("/send-document", upload.single("file"), async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(503).json({error: "WhatsApp not connected", status: connectionStatus});
        }

        const {phone, caption} = req.body;
        if (!phone || !req.file) {
            return res.status(400).json({error: "Phone and file are required"});
        }

        const jid = phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        const filePath = req.file.path;

        await sock.sendMessage(jid, {
            document: fs.readFileSync(filePath),
            mimetype: "application/pdf",
            fileName: req.file.originalname || "invoice.pdf",
            caption: caption || ""
        });

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({success: true, message: "Document sent successfully"});
    } catch (error) {
        console.error("Error sending document:", error);
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
        }
        res.status(500).json({error: error.message});
    }
});

// Reconnect
app.post("/reconnect", async (req, res) => {
    try {
        if (sock) {
            sock.end(undefined);
        }
        setTimeout(() => {
            connectToWhatsApp();
            res.json({success: true, message: "Reconnecting..."});
        }, 1000);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

// Logout (clear session)
app.post("/logout", async (req, res) => {
    try {
        const authPath = path.join(__dirname, "auth_info_baileys");

        // 1. Coba logout dari Baileys jika socket ada
        if (sock) {
            console.log("Attempting Baileys logout...");
            // Menggunakan sock.end(new Error('Logout requested')) lebih aman
            await sock.end(undefined);
            sock = null; // Set sock ke null setelah di-end
        }

        // 2. Hapus folder sesi secara paksa
        if (fs.existsSync(authPath)) {
            console.log("Removing auth folder:", authPath);
            // Gunakan fs.rmSync (Node 14+) atau fs.promises.rm (Node 16+)
            fs.rmSync(authPath, {recursive: true, force: true});
            console.log("Auth folder removed successfully.");
        } else {
            console.log("Auth folder not found, skipping removal.");
        }

        isConnected = false;
        connectionStatus = "logged_out";
        qrCodeData = null;

        // 3. Kirim respons
        res.json({success: true, message: "Logged out successfully. Please restart the server."});

        // Opsional: Langsung matikan server agar auto-restart (jika Anda pakai PM2/Nodemon)
        // process.exit(0);
    } catch (error) {
        console.error("CRITICAL ERROR in /logout:", error); // Log error
        res.status(500).json({error: error.message || "Logout process failed."});
    }
});

const PORT = process.env.WA_SERVICE_PORT || 8002;

app.listen(PORT, () => {
    console.log(`Baileys WhatsApp Service running on port ${PORT}`);
    connectToWhatsApp();
});
