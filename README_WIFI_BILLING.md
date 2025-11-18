# WiFi Billing & WhatsApp Invoice Sender - Dokumentasi Lengkap

## 🎯 Ringkasan Sistem

Sistem admin panel web untuk mengelola pelanggan WiFi, generate invoice PDF otomatis, dan mengirim invoice ke WhatsApp pelanggan menggunakan Baileys.

## ✅ Fitur yang Sudah Diimplementasi

### 1. **Manajemen Pelanggan (CRUD + Import)**
- ✅ Tambah, edit, hapus pelanggan
- ✅ Pencarian cepat (nama, ID, nomor WA, WiFi ID)
- ✅ Import data dari CSV/Excel
- ✅ Fields lengkap: customer_id, name, address, package, start_date, billing_cycle, next_due_date, phone_whatsapp, wifi_id, status, notes

### 2. **Template Invoice**
- ✅ Upload dan kelola multiple templates HTML/CSS
- ✅ Template default sudah disediakan
- ✅ Preview template sebelum save
- ✅ Placeholder support: {{name}}, {{customer_id}}, {{address}}, {{package}}, {{wifi_id}}, {{amount}}, {{due_date}}, {{invoice_number}}, {{date}}

### 3. **Generate PDF Invoice**
- ✅ Generate PDF server-side menggunakan WeasyPrint
- ✅ PDF rapi, A4 portrait, siap download
- ✅ Nomor invoice otomatis (format: INV-YYYYMMDD-XXXXX)

### 4. **WhatsApp Integration (Baileys)**
- ✅ Koneksi WhatsApp via Baileys
- ✅ QR Code scan untuk autentikasi
- ✅ Session persistence (auth tersimpan di file system)
- ✅ Auto reconnect jika terputus
- ✅ Kirim invoice PDF sebagai attachment
- ✅ Caption otomatis dengan detail tagihan
- ✅ Status monitoring (connected/disconnected/qr_ready)

### 5. **Dashboard & Reports**
- ✅ Dashboard dengan statistik:
  - Total pelanggan & pelanggan aktif
  - Total invoice (pending, sent, paid)
  - Invoice jatuh tempo (overdue)
  - Total pendapatan
- ✅ List tagihan jatuh tempo dengan detail pelanggan
- ✅ Tombol kirim reminder langsung

### 6. **Invoice Management**
- ✅ Generate invoice per pelanggan atau bulk
- ✅ Download invoice PDF
- ✅ Kirim via WhatsApp (single/bulk)
- ✅ Status tracking (pending, sent, paid, overdue)
- ✅ History invoice per pelanggan

## 🏗️ Arsitektur Sistem

### Backend Stack
- **Framework**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **PDF Generator**: WeasyPrint
- **WhatsApp Service**: Node.js + Baileys (port 8002)

### Frontend Stack
- **Framework**: React 19
- **Routing**: React Router v7
- **UI Components**: Shadcn UI (Radix UI)
- **Styling**: TailwindCSS
- **Icons**: Lucide React

### Services Architecture
```
┌─────────────────┐
│   React App     │ (Port 3000)
│   Frontend      │
└────────┬────────┘
         │ axios
         ↓
┌─────────────────┐
│   FastAPI       │ (Port 8001)
│   Backend       │
└────┬───────┬────┘
     │       │
     │       └─────→ ┌──────────────────┐
     │               │  Baileys WA      │ (Port 8002)
     │               │  Service         │
     │               └──────────────────┘
     ↓
┌─────────────────┐
│   MongoDB       │
│   Database      │
└─────────────────┘
```

## 📁 Struktur File

```
/app/
├── backend/
│   ├── server.py                    # Main FastAPI application
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Environment variables
│   ├── invoices/                    # Generated PDF invoices
│   ├── templates/                   # HTML template storage
│   └── whatsapp_service/           # Baileys WhatsApp service
│       ├── index.js                # WhatsApp service main
│       ├── package.json
│       └── auth_info_baileys/      # Session storage (auto-created)
│
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   ├── components/
    │   │   ├── Layout.jsx          # Main layout with sidebar
    │   │   └── ui/                 # Shadcn UI components
    │   └── pages/
    │       ├── Dashboard.jsx       # Dashboard page
    │       ├── Customers.jsx       # Customer management
    │       ├── Templates.jsx       # Template management
    │       ├── Invoices.jsx        # Invoice management
    │       └── WhatsAppSettings.jsx # WhatsApp settings & QR
    ├── package.json
    └── .env
```

## 🔧 API Endpoints

### Customer Endpoints
- `POST /api/customers` - Create customer
- `GET /api/customers?q=search` - Get/search customers
- `GET /api/customers/{id}` - Get single customer
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer
- `POST /api/customers/import` - Import CSV/Excel

### Template Endpoints
- `POST /api/templates` - Create template
- `GET /api/templates` - Get all templates
- `GET /api/templates/{id}` - Get single template
- `DELETE /api/templates/{id}` - Delete template

### Invoice Endpoints
- `POST /api/invoices/generate` - Generate invoice PDF
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/download/{invoice_number}` - Download PDF

### WhatsApp Endpoints
- `GET /api/whatsapp/status` - Get connection status
- `GET /api/whatsapp/qr` - Get QR code for scanning
- `POST /api/whatsapp/reconnect` - Reconnect to WhatsApp
- `POST /api/whatsapp/send-invoice?invoice_id={id}` - Send invoice
- `POST /api/whatsapp/bulk-send` - Bulk send invoices

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/overdue` - Get overdue invoices

## 🚀 Cara Menggunakan

### 1. Setup Awal

Semua dependencies sudah terinstall otomatis. Services sudah running:
- Backend: Port 8001
- Frontend: Port 3000
- WhatsApp Service: Port 8002

### 2. Koneksi WhatsApp (Pertama Kali)

1. Buka menu **WhatsApp** di sidebar
2. Anda akan melihat QR Code
3. Buka WhatsApp di ponsel Anda
4. Pilih **Menu → Linked Devices → Link a Device**
5. Scan QR Code yang muncul di layar
6. Tunggu hingga status berubah menjadi "Terhubung"

**Catatan**: Session akan tersimpan otomatis, tidak perlu scan ulang setelah restart.

### 3. Tambah Pelanggan

#### Manual (Satu-per-satu):
1. Masuk ke menu **Pelanggan**
2. Klik **Tambah Pelanggan**
3. Isi form:
   - ID Pelanggan (contoh: CUST-001)
   - Nama lengkap
   - Alamat
   - Paket WiFi (contoh: Premium 100Mbps)
   - WiFi ID
   - Tanggal mulai
   - Tanggal jatuh tempo
   - Nomor WhatsApp (format: 628123456789)
   - Status (active/suspended/cancelled)
   - Catatan (optional)
4. Klik **Simpan Pelanggan**

#### Import CSV/Excel:
1. Masuk ke menu **Pelanggan**
2. Klik **Import CSV/Excel**
3. Upload file dengan kolom:
   ```
   customer_id, name, address, package, start_date, next_due_date, phone_whatsapp, wifi_id
   ```
4. Sistem akan import otomatis dan tampilkan laporan

**Contoh CSV:**
```csv
customer_id,name,address,package,start_date,next_due_date,phone_whatsapp,wifi_id,status,notes
CUST-001,John Doe,Jl. Contoh No. 123,Premium 100Mbps,2025-01-01,2025-02-01,628123456789,WIFI-001,active,
CUST-002,Jane Smith,Jl. Sample No. 456,Basic 50Mbps,2025-01-01,2025-02-01,628987654321,WIFI-002,active,
```

### 4. Generate & Kirim Invoice

#### Single Invoice:
1. Masuk ke menu **Invoice**
2. Klik **Generate Invoice**
3. Pilih pelanggan
4. Pilih template (atau kosongkan untuk default)
5. Masukkan jumlah tagihan (Rp)
6. Tentukan tanggal jatuh tempo
7. Klik **Generate Invoice**
8. Setelah PDF dibuat, klik tombol **Send** (ikon WhatsApp) untuk kirim via WA

#### Bulk Send:
1. Masuk ke menu **Invoice**
2. Klik **Kirim Bulk**
3. Centang pelanggan yang ingin dikirim invoice
4. Masukkan jumlah tagihan
5. Tentukan tanggal jatuh tempo
6. Klik **Generate & Kirim via WhatsApp**
7. Sistem akan generate dan kirim otomatis ke semua pelanggan terpilih

### 5. Kelola Template

1. Masuk ke menu **Template**
2. Klik **Tambah Template**
3. Beri nama template
4. Edit HTML content sesuai kebutuhan
5. Gunakan placeholder:
   - `{{name}}` - Nama pelanggan
   - `{{customer_id}}` - ID pelanggan
   - `{{address}}` - Alamat
   - `{{package}}` - Paket WiFi
   - `{{wifi_id}}` - WiFi ID
   - `{{amount}}` - Jumlah tagihan
   - `{{due_date}}` - Tanggal jatuh tempo
   - `{{invoice_number}}` - Nomor invoice
   - `{{date}}` - Tanggal invoice dibuat
6. Klik **Preview** untuk melihat hasil
7. Centang "Jadikan template default" jika ingin dijadikan default
8. Klik **Simpan Template**

## 🔍 Monitoring & Dashboard

Dashboard menampilkan:
- **Total Pelanggan**: Jumlah total dan yang aktif
- **Total Invoice**: Breakdown pending, sent, paid
- **Invoice Jatuh Tempo**: List tagihan yang overdue
- **Total Pendapatan**: Revenue dari invoice yang sudah dibayar

## 🛠️ Troubleshooting

### WhatsApp tidak connect
1. Klik tombol **Reconnect** di WhatsApp Settings
2. Scan ulang QR Code jika muncul
3. Pastikan ponsel terhubung internet
4. Check status service: `curl http://localhost:8002/health`

### QR Code tidak muncul
1. Klik **Reconnect**
2. Tunggu beberapa detik hingga QR Code baru muncul
3. Refresh halaman browser

### PDF tidak tergenerate
1. Check log backend: `tail -f /var/log/supervisor/backend.err.log`
2. Pastikan WeasyPrint terinstall: `pip list | grep weasyprint`

### WhatsApp Service mati
Restart service:
```bash
cd /app/backend/whatsapp_service
node index.js > /tmp/wa_service.log 2>&1 &
```

Check log: `tail -f /tmp/wa_service.log`

## 📝 Format Nomor WhatsApp

Format yang **benar**:
- `628123456789` (tanpa + atau spasi)
- `6281234567890`

Format yang **salah**:
- `+62 812-3456-789` (ada symbol)
- `0812-3456-789` (pakai 0 di depan)

## 🔐 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://wireless-bill-mgmt.preview.emergentagent.com
```

## 🚀 Migrasi ke Twilio (Production)

Saat ini sistem menggunakan **Baileys** untuk development. Untuk production, disarankan migrasi ke **Twilio WhatsApp Business API**.

**Persiapan migrasi:**
1. Daftar akun Twilio
2. Setup WhatsApp Business API
3. Dapatkan credentials (Account SID, Auth Token, WhatsApp Number)
4. Update backend untuk hit Twilio API instead of localhost:8002

**Keuntungan Twilio:**
- ✅ Lebih stabil
- ✅ Tidak perlu QR scan
- ✅ Rate limit lebih tinggi
- ✅ Official support
- ✅ Delivery status tracking

## 🎨 Fitur UI

- ✅ Design modern dengan gradient sky-blue
- ✅ Responsive (desktop & mobile)
- ✅ Sidebar navigation
- ✅ Toast notifications (Sonner)
- ✅ Loading states
- ✅ Empty states
- ✅ Form validation
- ✅ Search & filter
- ✅ Status badges dengan color coding
- ✅ Card-based layout

## 📊 Status Badge Colors

- **Pelanggan**:
  - 🟢 Active (hijau)
  - ⚪ Suspended (abu)
  - ⚪ Cancelled (abu)

- **Invoice**:
  - 🟢 Paid (hijau)
  - 🔵 Sent (biru)
  - 🔴 Overdue (merah)
  - ⚫ Pending (abu)

## 🔄 Auto-Scheduler (Future Enhancement)

Untuk auto-send invoice sebelum jatuh tempo, implementasi scheduler dengan:
- APScheduler (Python)
- Cron job configurable via UI
- Settings: days before due, reminder days

## 💡 Tips & Best Practices

1. **Backup session WhatsApp**
   - Session tersimpan di: `/app/backend/whatsapp_service/auth_info_baileys/`
   - Backup folder ini untuk avoid re-scan QR

2. **Template HTML**
   - Gunakan inline CSS untuk compatibility
   - Test preview sebelum save
   - Avoid JavaScript di template

3. **Import Data**
   - Validate nomor WhatsApp format
   - Check duplicate customer_id sebelum import

4. **Invoice Numbering**
   - Format: INV-YYYYMMDD-XXXXX
   - Unique per generate

## 🎯 Completed Acceptance Criteria

✅ Admin dapat import pelanggan via CSV, data tersimpan di MongoDB
✅ Admin dapat search pelanggan dengan cepat
✅ Admin dapat generate invoice PDF yang rapi sesuai template
✅ PDF dapat diunduh
✅ Admin dapat mengirim invoice PDF ke WhatsApp pelanggan via Baileys
✅ Pesan terkirim dengan caption detail
✅ Dashboard menampilkan stats & overdue list
✅ WhatsApp status monitoring (connected/qr_ready/disconnected)
✅ Session persistence (tidak perlu scan ulang)
✅ Auto-reconnect on disconnect
✅ Dokumentasi lengkap deployment & setup

## 🎉 Sistem Siap Digunakan!

Semua fitur sudah berfungsi dengan baik. WhatsApp service sudah running dan siap menerima QR scan. 

**URL Akses**: https://wireless-bill-mgmt.preview.emergentagent.com

Silakan scan QR Code di menu WhatsApp untuk mulai menggunakan sistem! 🚀
