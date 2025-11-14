import React, {useEffect, useState, useRef} from "react";
import axios from "axios";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {Badge} from "../components/ui/badge";
import {toast} from "sonner";
import {MessageSquare, QrCode, RefreshCw, CheckCircle, XCircle, AlertCircle, LogOut} from "lucide-react";
import QRCode from "qrcode";
import {apiCall} from "@/lib/api-client";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

export const WhatsAppSettings = () => {
    const [status, setStatus] = useState(null);
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(false);
    const [connectedPhone, setConnectedPhone] = useState(null);
    const [isServiceDown, setIsServiceDown] = useState(false);
    const intervalRef = useRef(null);
    const failureCountRef = useRef(0); // Track consecutive failures

    useEffect(() => {
        checkStatus();
        // Polling interval: 15 detik (lebih santai dari 5 detik)
        intervalRef.current = setInterval(checkStatus, 15000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Get WhatsApp Status dengan error handling
    const checkStatus = async () => {
        try {
            const response = await axios.get(`${API}/api/whatsapp/status`, {
                timeout: 5000
            });

            setStatus(response.data);
            setIsServiceDown(false); // Service recovered
            failureCountRef.current = 0; // Reset failure counter

            // If connected, extract phone number
            if (response.data.status === "connected" && response.data.phone) {
                setConnectedPhone(response.data.phone);
            } else {
                setConnectedPhone(null);
            }

            // If QR available, fetch and generate QR code image
            if (response.data.status === "qr_ready" && response.data.qr_available) {
                fetchQRCode();
            } else {
                setQrCode(null);
            }
        } catch (error) {
            failureCountRef.current += 1;
            console.error(`❌ Status Check Failed (${failureCountRef.current}x):`, error.message);

            // Jika error lebih dari 2x, anggap service down
            if (failureCountRef.current > 2) {
                setIsServiceDown(true);
                setStatus({
                    status: "service_down",
                    connected: false,
                    message: "WhatsApp service tidak tersedia (port 8002 tidak merespons)"
                });
            }

            setConnectedPhone(null);
        }
    };

    // Get QR Code
    const fetchQRCode = async () => {
        try {
            const response = await axios.get(`${API}/api/whatsapp/qr`, {
                timeout: 5000
            });
            if (response.data.qr) {
                const qrImage = await QRCode.toDataURL(response.data.qr);
                setQrCode(qrImage);
            }
        } catch (error) {
            console.error("❌ Get QR Failed:", error.message);
        }
    };

    // Reconnect WhatsApp
    const handleReconnect = async () => {
        setLoading(true);
        try {
            await axios.post(
                `${API}/api/whatsapp/reconnect`,
                {},
                {
                    timeout: 5000
                }
            );
            toast.success("Reconnecting...");
            failureCountRef.current = 0;
            setIsServiceDown(false);
            setTimeout(() => checkStatus(), 2000);
        } catch (error) {
            console.error("❌ Reconnect Failed:", error.message);
            toast.error("Gagal reconnect. Cek apakah WhatsApp service (port 8002) running?");
        } finally {
            setLoading(false);
        }
    };

    // Logout WhatsApp
    const handleLogoutWhatsApp = async () => {
        if (!window.confirm("Yakin ingin logout WhatsApp? Anda perlu scan QR ulang.")) {
            return;
        }

        setLoading(true);
        try {
            await apiCall("/whatsapp/logout", {
                method: "POST",
                timeout: 5000
            });
            setQrCode(null);
            setConnectedPhone(null);
            setStatus({status: "disconnected", connected: false});
            setIsServiceDown(false);
            failureCountRef.current = 0;
            toast.success("WhatsApp logout berhasil. Silakan reconnect.");
            setTimeout(() => checkStatus(), 1000);
        } catch (error) {
            console.error("❌ Logout WhatsApp Failed:", error.message);
            toast.error("Gagal logout WhatsApp: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = () => {
        if (!status)
            return {
                color: "bg-slate-500",
                icon: AlertCircle,
                text: "Checking...",
                description: "Mengecek status koneksi"
            };

        switch (status.status) {
            case "connected":
                return {
                    color: "bg-green-500",
                    icon: CheckCircle,
                    text: "Terhubung",
                    description: "WhatsApp siap mengirim invoice"
                };
            case "qr_ready":
                return {
                    color: "bg-amber-500",
                    icon: QrCode,
                    text: "Scan QR Code",
                    description: "Scan QR code dengan WhatsApp Anda"
                };
            case "disconnected":
                return {
                    color: "bg-rose-500",
                    icon: XCircle,
                    text: "Terputus",
                    description: "Koneksi WhatsApp terputus"
                };
            case "service_down":
                return {
                    color: "bg-red-700",
                    icon: AlertCircle,
                    text: "Service Down",
                    description: "WhatsApp service (port 8002) tidak merespons"
                };
            default:
                return {
                    color: "bg-slate-500",
                    icon: AlertCircle,
                    text: status.status || "Unknown",
                    description: status.message || "Status tidak diketahui"
                };
        }
    };

    const statusInfo = getStatusInfo();
    const StatusIcon = statusInfo.icon;

    return (
        <div className="space-y-6" data-testid="whatsapp-page">
            <div>
                <h1 className="text-4xl font-bold text-slate-800 mb-2">WhatsApp Settings</h1>
                <p className="text-slate-600">Kelola koneksi WhatsApp untuk pengiriman invoice</p>
            </div>

            {/* Service Down Warning */}
            {isServiceDown && (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                    <p className="text-red-800 font-bold mb-2">⚠️ WhatsApp Service Down!</p>
                    <p className="text-red-700 text-sm mb-3">
                        Service di port 8002 tidak merespons. Lakukan langkah berikut:
                    </p>
                    <ol className="text-red-700 text-sm list-decimal list-inside space-y-1 mb-3">
                        <li>
                            Cek apakah WhatsApp service sudah di-start:{" "}
                            <code className="bg-red-100 px-2 py-1">ps aux | grep "node index.js"</code>
                        </li>
                        <li>
                            Jika tidak ada, restart service:{" "}
                            <code className="bg-red-100 px-2 py-1">
                                cd /app/backend/whatsapp_service && node index.js
                            </code>
                        </li>
                        <li>Setelah service running, klik tombol "Reconnect"</li>
                    </ol>
                    <Button onClick={handleReconnect} disabled={loading} className="bg-red-600 hover:bg-red-700">
                        🔄 Try Reconnect After Service Started
                    </Button>
                </div>
            )}

            {/* Status Card */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200" data-testid="status-card">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <MessageSquare className="text-green-600" />
                            Status Koneksi
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleReconnect}
                                disabled={loading || isServiceDown}
                                data-testid="reconnect-button"
                            >
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                <span className="ml-2">Reconnect</span>
                            </Button>
                            <Button
                                onClick={handleLogoutWhatsApp}
                                variant="destructive"
                                disabled={loading || isServiceDown}
                                size="sm"
                            >
                                <LogOut size={14} />
                                <span className="ml-2">Logout & Reset</span>
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-full ${statusInfo.color} bg-opacity-10`}>
                            <StatusIcon className={`${statusInfo.color.replace("bg-", "text-")} w-8 h-8`} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold text-slate-800">{statusInfo.text}</h3>
                                <Badge className={statusInfo.color}>{status?.connected ? "Online" : "Offline"}</Badge>
                            </div>
                            <p className="text-slate-600 mb-3">{statusInfo.description}</p>

                            {/* Connected Phone Number Indicator */}
                            {status?.status === "connected" && connectedPhone && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                                    <p className="text-sm text-green-700">
                                        <strong>📱 Nomor HP Terkoneksi:</strong>
                                    </p>
                                    <p className="text-lg font-mono font-bold text-green-600 mt-1">{connectedPhone}</p>
                                </div>
                            )}

                            {/* Disconnected State */}
                            {status?.status !== "connected" && !isServiceDown && (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4">
                                    <p className="text-sm text-slate-600">
                                        <strong>⚠️ Tidak Ada Koneksi</strong>
                                    </p>
                                    <p className="text-slate-500 mt-1">
                                        Silakan klik "Reconnect" atau lakukan scan QR code untuk menghubungkan WhatsApp
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Card */}
            {qrCode && status?.status === "qr_ready" && (
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-amber-200" data-testid="qr-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="text-amber-600" />
                            Scan QR Code
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="bg-white p-6 rounded-xl border-2 border-amber-200 flex justify-center">
                                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" data-testid="qr-image" />
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h4 className="font-semibold text-amber-900 mb-2">Cara Scan QR Code:</h4>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-amber-800">
                                    <li>Buka WhatsApp di ponsel Anda</li>
                                    <li>Ketuk Menu atau Settings, lalu pilih Linked Devices</li>
                                    <li>Ketuk "Link a Device"</li>
                                    <li>Arahkan ponsel ke layar ini untuk scan QR code</li>
                                </ol>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Card */}
            <Card className="bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-sky-900">Tentang Baileys WhatsApp</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-sky-800">
                    <p>
                        <strong>Baileys</strong> adalah library open-source untuk mengintegrasikan WhatsApp Web tanpa
                        API resmi.
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-sky-200">
                        <h4 className="font-semibold mb-2 text-sky-900">Catatan Penting:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Session akan disimpan secara otomatis, tidak perlu scan ulang setelah restart</li>
                            <li>Jika koneksi terputus, sistem akan otomatis reconnect</li>
                            <li>Untuk production, disarankan migrasi ke WhatsApp Business API (Twilio/360dialog)</li>
                            <li>Pastikan ponsel terhubung internet agar tetap aktif</li>
                        </ul>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold mb-2 text-blue-900">Troubleshooting:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Jika QR tidak muncul, klik tombol Reconnect</li>
                            <li>Jika gagal kirim pesan, cek status koneksi terlebih dahulu</li>
                            <li>Session error? Logout dari WhatsApp Web ponsel dan scan ulang</li>
                            <li>Jika ingin reset session, gunakan tombol "Logout & Reset"</li>
                            <li>
                                <strong>Service Down?</strong> Restart WhatsApp service di port 8002
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Service Info */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-slate-200">
                <CardHeader>
                    <CardTitle>Informasi Service</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Provider</p>
                            <p className="text-lg font-semibold text-slate-800">Baileys (Open Source)</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Service Port</p>
                            <p className="text-lg font-semibold text-slate-800">8002</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Session Storage</p>
                            <p className="text-lg font-semibold text-slate-800">File System</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Polling Interval</p>
                            <p className="text-lg font-semibold text-slate-800">15 Detik</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppSettings;
