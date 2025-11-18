from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import pandas as pd
import io
import aiofiles
import requests
import json
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

ROOT_DIR = Path(__file__).parent    
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WhatsApp Service URL
WA_SERVICE_URL = "http://localhost:8002"

# Ensure directories exist
Path("./invoices").mkdir(exist_ok=True)
Path("./templates").mkdir(exist_ok=True)

# Scheduler
scheduler = AsyncIOScheduler()

# ============ MODELS ============

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    name: str
    address: str
    package: str
    start_date: str
    billing_cycle: str = "monthly"
    next_due_date: str
    phone_whatsapp: str
    wifi_id: str
    status: str = "active"  # active, suspended, cancelled
    notes: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerCreate(BaseModel):
    customer_id: str
    name: str
    address: str
    package: str
    start_date: str
    billing_cycle: str = "monthly"
    next_due_date: str
    phone_whatsapp: str
    wifi_id: str
    status: str = "active"
    notes: Optional[str] = ""

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    package: Optional[str] = None
    start_date: Optional[str] = None
    next_due_date: Optional[str] = None
    phone_whatsapp: Optional[str] = None
    wifi_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class InvoiceTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    html_content: str
    is_default: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InvoiceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    invoice_number: str
    amount: float
    due_date: str
    status: str = "pending"  # pending, sent, paid, overdue
    pdf_path: Optional[str] = ""
    sent_at: Optional[str] = ""
    paid_at: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SendInvoiceRequest(BaseModel):
    customer_id: str
    template_id: Optional[str] = None
    amount: float
    due_date: str

class BulkSendRequest(BaseModel):
    customer_ids: List[str]
    amount: float
    due_date: str
    template_id: Optional[str] = None

class SchedulerSettings(BaseModel):
    enabled: bool = False
    days_before_due: int = 2
    reminder_days: List[int] = [1, 3]  # Days after due date
    cron_time: str = "09:00"  # HH:MM format

class WhatsAppSettings(BaseModel):
    provider: str = "baileys"  # baileys or twilio
    enabled: bool = False

# ============ CUSTOMER ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "WiFi Billing & Invoice System API"}

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate):
    customer_obj = Customer(**customer.model_dump())
    doc = customer_obj.model_dump()
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(q: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"customer_id": {"$regex": q, "$options": "i"}},
            {"phone_whatsapp": {"$regex": q, "$options": "i"}},
            {"wifi_id": {"$regex": q, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, update_data: CustomerUpdate):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        await db.customers.update_one({"id": customer_id}, {"$set": update_dict})
    
    updated_customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return updated_customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"success": True, "message": "Customer deleted"}

@api_router.post("/customers/import")
async def import_customers(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # Detect file type and read
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="File must be CSV or Excel")
        
        # Expected columns
        required_cols = ['customer_id', 'name', 'address', 'package', 'start_date', 
                        'next_due_date', 'phone_whatsapp', 'wifi_id']
        
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, 
                              detail=f"Missing columns: {', '.join(missing_cols)}")
        
        imported = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                customer_data = {
                    'customer_id': str(row['customer_id']),
                    'name': str(row['name']),
                    'address': str(row['address']),
                    'package': str(row['package']),
                    'start_date': str(row['start_date']),
                    'next_due_date': str(row['next_due_date']),
                    'phone_whatsapp': str(row['phone_whatsapp']),
                    'wifi_id': str(row['wifi_id']),
                    'billing_cycle': str(row.get('billing_cycle', 'monthly')),
                    'status': str(row.get('status', 'active')),
                    'notes': str(row.get('notes', ''))
                }
                
                customer_obj = Customer(**customer_data)
                doc = customer_obj.model_dump()
                await db.customers.insert_one(doc)
                imported += 1
            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")
        
        return {
            "success": True,
            "imported": imported,
            "total_rows": len(df),
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============ TEMPLATE ENDPOINTS ============

@api_router.post("/templates", response_model=InvoiceTemplate)
async def create_template(template: InvoiceTemplate):
    # If this is default, unset others
    if template.is_default:
        await db.templates.update_many({}, {"$set": {"is_default": False}})
    
    doc = template.model_dump()
    await db.templates.insert_one(doc)
    return template

@api_router.get("/templates", response_model=List[InvoiceTemplate])
async def get_templates():
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    return templates

@api_router.get("/templates/{template_id}", response_model=InvoiceTemplate)
async def get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}

# ============ INVOICE GENERATION ============

@api_router.post("/invoices/generate")
async def generate_invoice(request: SendInvoiceRequest):
    # Get customer
    customer = await db.customers.find_one({"id": request.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get template
    if request.template_id:
        template = await db.templates.find_one({"id": request.template_id}, {"_id": 0})
    else:
        template = await db.templates.find_one({"is_default": True}, {"_id": 0})
    
    if not template:
        raise HTTPException(status_code=404, detail="No template found")
    
    # Generate invoice number
    invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Replace placeholders in HTML
    html_content = template['html_content']
    html_content = html_content.replace('{{name}}', customer['name'])
    html_content = html_content.replace('{{customer_id}}', customer['customer_id'])
    html_content = html_content.replace('{{address}}', customer['address'])
    html_content = html_content.replace('{{package}}', customer['package'])
    html_content = html_content.replace('{{wifi_id}}', customer['wifi_id'])
    html_content = html_content.replace('{{amount}}', f"Rp {request.amount:,.0f}")
    html_content = html_content.replace('{{due_date}}', request.due_date)
    html_content = html_content.replace('{{invoice_number}}', invoice_number)
    html_content = html_content.replace('{{date}}', datetime.now().strftime('%d/%m/%Y'))
    
    # Save HTML temporarily
    html_path = f"./invoices/{invoice_number}.html"
    pdf_path = f"./invoices/{invoice_number}.pdf"
    
    async with aiofiles.open(html_path, 'w', encoding='utf-8') as f:
        await f.write(html_content)
    
    # Generate PDF using wkhtmltopdf (simpler alternative to Puppeteer)
    import subprocess
    try:
        # Try wkhtmltopdf first
        subprocess.run(['wkhtmltopdf', '--enable-local-file-access', 
                       html_path, pdf_path], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        # Fallback: use weasyprint
        try:
            from weasyprint import HTML
            HTML(string=html_content).write_pdf(pdf_path)
        except ImportError:
            raise HTTPException(status_code=500, 
                              detail="PDF generation tools not available. Install wkhtmltopdf or weasyprint.")
    
    # Save invoice record
    invoice_record = InvoiceRecord(
        customer_id=request.customer_id,
        invoice_number=invoice_number,
        amount=request.amount,
        due_date=request.due_date,
        pdf_path=pdf_path,
        status="generated"
    )
    await db.invoices.insert_one(invoice_record.model_dump())
    
    return {
        "success": True,
        "invoice_number": invoice_number,
        "pdf_path": pdf_path,
        "invoice_id": invoice_record.id
    }

@api_router.get("/invoices/download/{invoice_number}")
async def download_invoice(invoice_number: str):
    pdf_path = f"./invoices/{invoice_number}.pdf"
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return FileResponse(pdf_path, filename=f"{invoice_number}.pdf")

@api_router.get("/invoices")
async def get_invoices(customer_id: Optional[str] = None, status: Optional[str] = None):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if status:
        query["status"] = status
    
    invoices = await db.invoices.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return invoices

# ============ WHATSAPP ENDPOINTS ============

@api_router.get("/whatsapp/status")
async def whatsapp_status():
    try:
        response = requests.get(f"{WA_SERVICE_URL}/health", timeout=5)
        return response.json()
    except Exception as e:
        return {"status": "error", "message": str(e), "connected": False}

@api_router.get("/whatsapp/qr")
async def whatsapp_qr():
    try:
        response = requests.get(f"{WA_SERVICE_URL}/qr", timeout=5)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@api_router.post("/whatsapp/reconnect")
async def whatsapp_reconnect():
    try:
        response = requests.post(f"{WA_SERVICE_URL}/reconnect", timeout=5)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@api_router.post("/whatsapp/send-invoice")
async def send_invoice_whatsapp(invoice_id: str, background_tasks: BackgroundTasks):
    # Get invoice
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get customer
    customer = await db.customers.find_one({"id": invoice['customer_id']}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check WhatsApp status
    wa_status = await whatsapp_status()
    if not wa_status.get('connected'):
        raise HTTPException(status_code=503, detail="WhatsApp not connected")
    
    # Send via WhatsApp
    try:
        caption = f"Halo {customer['name']},\n\nBerikut invoice tagihan WiFi Anda:\n\nNomor Invoice: {invoice['invoice_number']}\nJumlah: Rp {invoice['amount']:,.0f}\nJatuh Tempo: {invoice['due_date']}\n\nTerima kasih!"
        
        # Send document
        with open(invoice['pdf_path'], 'rb') as f:
            files = {'file': (f"{invoice['invoice_number']}.pdf", f, 'application/pdf')}
            data = {
                'phone': customer['phone_whatsapp'],
                'caption': caption
            }
            response = requests.post(f"{WA_SERVICE_URL}/send-document", 
                                   files=files, data=data, timeout=30)
        
        if response.status_code == 200:
            # Update invoice status
            await db.invoices.update_one(
                {"id": invoice_id},
                {"$set": {
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return {"success": True, "message": "Invoice sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=response.json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/whatsapp/bulk-send")
async def bulk_send_invoices(request: BulkSendRequest):
    results = []
    for customer_id in request.customer_ids:
        try:
            # Generate invoice
            invoice_req = SendInvoiceRequest(
                customer_id=customer_id,
                amount=request.amount,
                due_date=request.due_date,
                template_id=request.template_id
            )
            invoice_result = await generate_invoice(invoice_req)
            
            # Send via WhatsApp
            send_result = await send_invoice_whatsapp(invoice_result['invoice_id'], BackgroundTasks())
            results.append({
                "customer_id": customer_id,
                "success": True,
                "invoice_number": invoice_result['invoice_number']
            })
        except Exception as e:
            results.append({
                "customer_id": customer_id,
                "success": False,
                "error": str(e)
            })
    
    return {"results": results}

# ============ DASHBOARD STATS ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    # Total customers
    total_customers = await db.customers.count_documents({})
    active_customers = await db.customers.count_documents({"status": "active"})
    
    # Invoices
    total_invoices = await db.invoices.count_documents({})
    pending_invoices = await db.invoices.count_documents({"status": "pending"})
    sent_invoices = await db.invoices.count_documents({"status": "sent"})
    paid_invoices = await db.invoices.count_documents({"status": "paid"})
    
    # Overdue (compare with today)
    today = datetime.now().strftime('%Y-%m-%d')
    overdue_invoices = await db.invoices.count_documents({
        "status": {"$in": ["pending", "sent"]},
        "due_date": {"$lt": today}
    })
    
    # Revenue
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]['total'] if revenue_result else 0
    
    return {
        "customers": {
            "total": total_customers,
            "active": active_customers
        },
        "invoices": {
            "total": total_invoices,
            "pending": pending_invoices,
            "sent": sent_invoices,
            "paid": paid_invoices,
            "overdue": overdue_invoices
        },
        "revenue": total_revenue
    }

@api_router.get("/dashboard/overdue")
async def get_overdue_customers():
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Get overdue invoices with customer info
    invoices = await db.invoices.find({
        "status": {"$in": ["pending", "sent"]},
        "due_date": {"$lt": today}
    }, {"_id": 0}).to_list(1000)
    
    # Enrich with customer data
    result = []
    for invoice in invoices:
        customer = await db.customers.find_one({"id": invoice['customer_id']}, {"_id": 0})
        if customer:
            result.append({
                **invoice,
                "customer_name": customer['name'],
                "customer_phone": customer['phone_whatsapp']
            })
    
    return result

# ============ SCHEDULER SETTINGS ============

@api_router.get("/scheduler/settings")
async def get_scheduler_settings():
    settings = await db.settings.find_one({"type": "scheduler"}, {"_id": 0})
    if not settings:
        return SchedulerSettings().model_dump()
    return settings

@api_router.post("/scheduler/settings")
async def update_scheduler_settings(settings: SchedulerSettings):
    await db.settings.update_one(
        {"type": "scheduler"},
        {"$set": settings.model_dump()},
        upsert=True
    )
    
    # Restart scheduler if enabled
    if settings.enabled:
        # TODO: Implement actual scheduler logic
        pass
    
    return {"success": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("WiFi Billing System started")
    # Create default template if not exists
    template_count = await db.templates.count_documents({})
    if template_count == 0:
        default_template = InvoiceTemplate(
            name="Template Default",
            html_content="""
<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .company { font-size: 24px; font-weight: bold; color: #1e40af; }
        .invoice-title { font-size: 32px; color: #2563eb; margin-top: 10px; }
        .info-section { margin-top: 30px; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .table th { background-color: #2563eb; color: white; }
        .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class='header'>
        <div class='company'>WiFi Billing System</div>
        <div class='invoice-title'>INVOICE</div>
    </div>
    
    <div class='info-section'>
        <div class='info-row'>
            <div><span class='label'>Nomor Invoice:</span> {{invoice_number}}</div>
            <div><span class='label'>Tanggal:</span> {{date}}</div>
        </div>
        <div class='info-row'>
            <div><span class='label'>Jatuh Tempo:</span> {{due_date}}</div>
        </div>
    </div>
    
    <div class='info-section'>
        <h3>Pelanggan:</h3>
        <div><span class='label'>Nama:</span> {{name}}</div>
        <div><span class='label'>ID Pelanggan:</span> {{customer_id}}</div>
        <div><span class='label'>Alamat:</span> {{address}}</div>
        <div><span class='label'>WiFi ID:</span> {{wifi_id}}</div>
    </div>
    
    <table class='table'>
        <thead>
            <tr>
                <th>Deskripsi</th>
                <th>Paket</th>
                <th>Jumlah</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Tagihan WiFi Bulanan</td>
                <td>{{package}}</td>
                <td>{{amount}}</td>
            </tr>
        </tbody>
    </table>
    
    <div class='total'>
        Total: {{amount}}
    </div>
    
    <div class='footer'>
        <p>Terima kasih atas kepercayaan Anda!</p>
        <p>Untuk pertanyaan, hubungi customer service kami.</p>
    </div>
</body>
</html>
            """,
            is_default=True
        )
        await db.templates.insert_one(default_template.model_dump())
        logger.info("Default template created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
