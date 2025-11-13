import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, QrCode, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

export const WhatsAppSettings = () => {
  const [status, setStatus] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API}/status`);
      setStatus(response.data);
      
      // If QR available, fetch and generate QR code image
      if (response.data.status === 'qr_ready' && response.data.qr_available) {
        fetchQRCode();
      } else {
        setQrCode(null);
      }
    } catch (error) {
      setStatus({ status: 'error', connected: false, message: 'WhatsApp service tidak tersedia' });
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await axios.get(`${API}/qr`);
      if (response.data.qr) {
        // Generate QR code image
        const qrImage = await QRCode.toDataURL(response.data.qr);
        setQrCode(qrImage);
      }
    } catch (error) {
      console.error('Failed to fetch QR code');
    }
  };

  const handleReconnect = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/reconnect`);
      toast.success('Reconnecting...');
      setTimeout(() => checkStatus(), 2000);
    } catch (error) {
      toast.error('Gagal reconnect');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = () => {
    if (!status) return { color: 'bg-slate-500', icon: AlertCircle, text: 'Checking...', description: 'Mengecek status koneksi' };
    
    switch(status.status) {
      case 'connected':
        return { 
          color: 'bg-green-500', 
          icon: CheckCircle, 
          text: 'Terhubung', 
          description: 'WhatsApp siap mengirim invoice'
        };
      case 'qr_ready':
        return { 
          color: 'bg-amber-500', 
          icon: QrCode, 
          text: 'Scan QR Code', 
          description: 'Scan QR code dengan WhatsApp Anda'
        };
      case 'disconnected':
        return { 
          color: 'bg-rose-500', 
          icon: XCircle, 
          text: 'Terputus', 
          description: 'Koneksi WhatsApp terputus'
        };
      default:
        return { 
          color: 'bg-slate-500', 
          icon: AlertCircle, 
          text: status.status, 
          description: status.message || 'Status tidak diketahui'
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

      {/* Status Card */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200" data-testid="status-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquare className="text-green-600" />
              Status Koneksi
            </span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleReconnect} 
              disabled={loading}
              data-testid="reconnect-button"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="ml-2">Reconnect</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-full ${statusInfo.color} bg-opacity-10`}>
              <StatusIcon className={`${statusInfo.color.replace('bg-', 'text-')} w-8 h-8`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-slate-800">{statusInfo.text}</h3>
                <Badge className={statusInfo.color}>
                  {status?.connected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="text-slate-600">{statusInfo.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Card */}
      {qrCode && status?.status === 'qr_ready' && (
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
            <strong>Baileys</strong> adalah library open-source untuk mengintegrasikan WhatsApp Web tanpa API resmi.
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
              <p className="text-sm text-slate-600 mb-1">Auto Reconnect</p>
              <p className="text-lg font-semibold text-slate-800">Enabled</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSettings;
