# Deployment Notes - WiFi Billing System

## 🚀 Services yang Running

### 1. Backend (FastAPI)
- **Port**: 8001
- **Status**: ✅ Running via Supervisor
- **Command**: Auto-managed by supervisor
- **Logs**: `/var/log/supervisor/backend.err.log`

### 2. Frontend (React)
- **Port**: 3000
- **Status**: ✅ Running via Supervisor
- **Command**: Auto-managed by supervisor
- **Logs**: `/var/log/supervisor/frontend.err.log`

### 3. WhatsApp Service (Baileys)
- **Port**: 8002
- **Status**: ✅ Running (Manual start)
- **Location**: `/app/backend/whatsapp_service/`
- **Command**: `node index.js`
- **Logs**: `/tmp/wa_service.log`

## 📝 Manual Start WhatsApp Service

Jika WhatsApp service perlu direstart:

```bash
# Stop existing process (if any)
pkill -f "node index.js"

# Start WhatsApp service
cd /app/backend/whatsapp_service
node index.js > /tmp/wa_service.log 2>&1 &

# Check if running
ps aux | grep "node index.js"

# Check logs
tail -f /tmp/wa_service.log

# Check status via API
curl http://localhost:8002/health
```

## 🔄 Restart Services

### Backend & Frontend
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### WhatsApp Service
```bash
pkill -f "node index.js"
cd /app/backend/whatsapp_service && node index.js > /tmp/wa_service.log 2>&1 &
```

## 🗄️ MongoDB

MongoDB running locally pada `localhost:27017`
Database name: `test_database`

### Collections:
- `customers` - Data pelanggan
- `templates` - Template invoice
- `invoices` - Invoice records
- `settings` - System settings

### Check MongoDB
```bash
# Connect to MongoDB
mongosh

# Use database
use test_database

# Show collections
show collections

# Count documents
db.customers.countDocuments()
db.invoices.countDocuments()
```

## 📂 Important Directories

### Generated Files
- **PDF Invoices**: `/app/backend/invoices/`
- **WhatsApp Session**: `/app/backend/whatsapp_service/auth_info_baileys/`
- **Uploaded Files**: `/app/backend/whatsapp_service/uploads/`

### Backup Recommendations
Backup these directories regularly:
1. `/app/backend/whatsapp_service/auth_info_baileys/` - WhatsApp session
2. MongoDB database - Customer & invoice data

## 🔧 Environment Configuration

### Backend Environment
File: `/app/backend/.env`
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
```

### Frontend Environment
File: `/app/frontend/.env`
```env
REACT_APP_BACKEND_URL=https://wireless-bill-mgmt.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

**⚠️ NEVER modify these environment files unless necessary!**

## 📊 Service Health Checks

### Quick Health Check
```bash
# Backend
curl http://localhost:8001/api/

# Frontend
curl http://localhost:3000

# WhatsApp Service
curl http://localhost:8002/health

# MongoDB
mongosh --eval "db.runCommand({ ping: 1 })"
```

### All Services Status
```bash
# Supervisor services
sudo supervisorctl status

# WhatsApp service
ps aux | grep "node index.js" | grep -v grep

# Ports listening
netstat -tulpn | grep -E '8001|3000|8002|27017'
```

## 🐛 Common Issues & Solutions

### Issue: WhatsApp Service Not Starting

**Symptoms**: 
- Cannot access http://localhost:8002/health
- No QR Code appears

**Solution**:
```bash
# Check if port is in use
lsof -i :8002

# Kill existing process
pkill -f "node index.js"

# Restart service
cd /app/backend/whatsapp_service
node index.js > /tmp/wa_service.log 2>&1 &

# Check logs
tail -f /tmp/wa_service.log
```

### Issue: WhatsApp Disconnected

**Symptoms**:
- Status shows "disconnected"
- Cannot send messages

**Solution**:
1. Click "Reconnect" button in WhatsApp Settings page
2. Scan QR Code again if prompted
3. Check if phone is connected to internet

### Issue: PDF Generation Failed

**Symptoms**:
- Error when generating invoice
- PDF not created

**Solution**:
```bash
# Check WeasyPrint installation
pip list | grep weasyprint

# Reinstall if needed
pip install weasyprint

# Check backend logs
tail -f /var/log/supervisor/backend.err.log
```

### Issue: MongoDB Connection Error

**Symptoms**:
- Backend shows MongoDB connection error
- Cannot fetch customers/invoices

**Solution**:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# Check connection
mongosh --eval "db.runCommand({ ping: 1 })"
```

## 🔐 Security Notes

### Session Security
- WhatsApp session stored locally in file system
- **Recommendation**: Add encryption for production
- Session files contain authentication tokens

### API Security
- Currently no authentication on API endpoints
- **Recommendation**: Add JWT authentication for production
- Implement rate limiting

### Database Security
- MongoDB running without authentication (development)
- **Recommendation**: Enable MongoDB authentication for production

## 📈 Performance Optimization

### Current Setup
- WeasyPrint for PDF generation (synchronous)
- Direct WhatsApp send (no queue)

### Production Recommendations
1. **Add Redis + BullMQ** for job queue
2. **Implement rate limiting** for WhatsApp sends
3. **Add caching** for dashboard stats
4. **Use CDN** for static assets
5. **Enable compression** for API responses

## 🔄 Migration to Twilio (Production)

### Steps:
1. Sign up for Twilio account
2. Set up WhatsApp Business API
3. Get credentials:
   - Account SID
   - Auth Token
   - WhatsApp Number (Sandbox or approved)

4. Update backend `/api/whatsapp/send-invoice` endpoint:
```python
# Replace Baileys call with Twilio
from twilio.rest import Client

client = Client(account_sid, auth_token)
message = client.messages.create(
    from_='whatsapp:+14155238886',  # Twilio number
    body='Invoice message',
    to=f'whatsapp:{customer_phone}',
    media_url=[pdf_url]
)
```

5. Stop Baileys service (no longer needed)
6. Update frontend to remove QR Code page

## 📦 Dependencies Installed

### Backend (Python)
```
fastapi==0.110.1
motor==3.3.1
pymongo==4.5.0
pandas==2.3.3
openpyxl==3.1.5
weasyprint==66.0
aiofiles==25.1.0
pillow==12.0.0
qrcode==8.2
apscheduler==3.11.1
```

### Frontend (Node)
```
react@19.0.0
react-router-dom@7.5.1
axios@1.8.4
papaparse (CSV parser)
xlsx (Excel parser)
recharts (for future charts)
qrcode (QR generation)
lucide-react (icons)
```

### WhatsApp Service (Node)
```
@whiskeysockets/baileys@6.7.9
express@4.21.2
qrcode-terminal@0.12.0
multer@1.4.5-lts.1
cors@2.8.5
```

## 🎯 Production Checklist

Before going to production:

- [ ] Enable MongoDB authentication
- [ ] Add API authentication (JWT)
- [ ] Implement rate limiting
- [ ] Setup Redis for job queue
- [ ] Migrate to Twilio WhatsApp API
- [ ] Add SSL certificates
- [ ] Setup monitoring (Sentry, Datadog, etc.)
- [ ] Implement backup strategy
- [ ] Add unit & integration tests
- [ ] Setup CI/CD pipeline
- [ ] Configure firewall rules
- [ ] Enable CORS properly (not *)
- [ ] Add audit logging
- [ ] Implement data encryption
- [ ] Setup auto-scaling (if needed)

## 📞 Support

Jika ada masalah atau pertanyaan, check:
1. Logs: `/var/log/supervisor/` untuk backend/frontend
2. `/tmp/wa_service.log` untuk WhatsApp service
3. MongoDB logs: `/var/log/mongodb/`
4. README lengkap: `/app/README_WIFI_BILLING.md`

---

**System Version**: 1.0.0  
**Last Updated**: 2025-01-12  
**Status**: ✅ Fully Operational
