import express from "express";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import InvoiceTemplate from "../models/InvoiceTemplate.js";
import {asyncHandler} from "../middleware/errorHandler.js";
import {generateInvoicePDF} from "../utils/pdfGenerator.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:8002";

// Generate invoice number
const generateInvoiceNumber = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Count today's invoices
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await Invoice.countDocuments({
        createdAt: {$gte: startOfDay, $lte: endOfDay}
    });

    // Generate random hex
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();

    return `INV-${year}${month}${day}-${random}`;
};

// GET semua invoices + filter
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const {customer_id, status, page = 1, limit = 100, start_date, end_date} = req.query;

        const query = {};

        if (customer_id) query.customer_id = customer_id;
        if (status) query.status = status;

        if (start_date || end_date) {
            query.createdAt = {};
            if (start_date) query.createdAt.$gte = new Date(start_date);
            if (end_date) query.createdAt.$lte = new Date(end_date);
        }

        const skip = (page - 1) * limit;

        const invoices = await Invoice.find(query)
            .populate("customer_id")
            .sort({createdAt: -1})
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Invoice.countDocuments(query);

        console.log(`✅ Fetched ${invoices.length} invoices`);

        res.json({
            data: invoices,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        });
    })
);

// GET single invoice
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const invoice = await Invoice.findById(req.params.id).populate("customer_id");

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        res.json(invoice);
    })
);

// GENERATE invoice (CREATE invoice + PDF + optional send)
router.post(
    "/generate",
    asyncHandler(async (req, res) => {
        const {customer_id, template_id, amount, due_date, send_whatsapp} = req.body;

        console.log("📝 Generating invoice for customer:", customer_id);

        if (!customer_id || !amount || !due_date) {
            return res.status(400).json({
                error: "customer_id, amount, due_date wajib diisi"
            });
        }

        const customer = await Customer.findById(customer_id);

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();

        const totalAmount = parseFloat(amount);
        const dueDate = new Date(due_date);

        const newInvoice = new Invoice({
            invoice_number: invoiceNumber,
            customer_id,
            customer_name: customer.name,
            customer_phone: customer.phone_whatsapp,
            package: customer.package,
            period_start: new Date(),
            period_end: dueDate,
            amount: totalAmount,
            tax: 0,
            total_amount: totalAmount,
            due_date: dueDate,
            status: "draft",
            notes: ""
        });

        await newInvoice.save();

        console.log(`✅ Invoice created: ${newInvoice.invoice_number}`);

        // Generate PDF
        try {
            const template = template_id ? await InvoiceTemplate.findById(template_id) : null;
            const htmlContent = template?.body || null;

            const pdfBuffer = await generateInvoicePDF(newInvoice, customer, htmlContent);

            // Save PDF to disk
            const invoicesDir = path.join(__dirname, "..", "invoices");
            if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, {recursive: true});
            }

            const pdfPath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
            fs.writeFileSync(pdfPath, pdfBuffer);

            newInvoice.pdf_url = `/invoices/${invoiceNumber}.pdf`;
            await newInvoice.save();

            console.log(`✅ PDF generated: ${pdfPath}`);
        } catch (error) {
            console.error("❌ PDF generation failed:", error);
        }

        // Send via WhatsApp (optional)
        if (send_whatsapp) {
            try {
                const message = `
🧾 *INVOICE TAGIHAN WIFI*

Halo ${customer.name},

📋 Detail Invoice:
• Invoice No: ${invoiceNumber}
• Paket: ${customer.package}
• Jumlah: Rp ${totalAmount.toLocaleString("id-ID")}
• Jatuh Tempo: ${dueDate.toLocaleDateString("id-ID")}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Terima kasih! 🙏
                `.trim();

                await axios.post(`${WHATSAPP_SERVICE_URL}/send-message`, {
                    phone: customer.phone_whatsapp,
                    message: message
                });

                newInvoice.status = "sent";
                newInvoice.sent_at = new Date();
                newInvoice.sent_via = "whatsapp";
                await newInvoice.save();

                console.log(`✅ Invoice sent via WhatsApp to ${customer.phone_whatsapp}`);
            } catch (error) {
                console.error("❌ WhatsApp send failed:", error.message);
            }
        }

        res.status(201).json({
            message: "Invoice berhasil dibuat",
            data: newInvoice
        });
    })
);

// UPDATE invoice
router.put(
    "/:id",
    asyncHandler(async (req, res) => {
        const {amount, tax, status, payment_date, payment_method, notes} = req.body;

        console.log(`📝 Updating invoice: ${req.params.id}`);

        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        // Update fields
        if (amount !== undefined) invoice.amount = parseFloat(amount);
        if (tax !== undefined) invoice.tax = parseFloat(tax);
        if (status) invoice.status = status;
        if (payment_date) invoice.payment_date = new Date(payment_date);
        if (payment_method) invoice.payment_method = payment_method;
        if (notes !== undefined) invoice.notes = notes;

        // Recalculate total
        invoice.total_amount = invoice.amount + invoice.tax;

        // Update customer stats
        if (status === "paid") {
            const customer = await Customer.findById(invoice.customer_id);
            if (customer) {
                customer.total_paid = (customer.total_paid || 0) + invoice.total_amount;
                customer.last_payment_date = new Date();
                await customer.save();
            }
        }

        await invoice.save();

        console.log(`✅ Invoice updated: ${invoice._id}`);

        res.json({
            message: "Invoice berhasil diupdate",
            data: invoice
        });
    })
);

// DELETE invoice
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        console.log(`🗑️ Deleting invoice: ${req.params.id}`);

        const invoice = await Invoice.findByIdAndDelete(req.params.id);

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        // Delete PDF file
        if (invoice.pdf_url) {
            const pdfPath = path.join(__dirname, "..", invoice.pdf_url);
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
            }
        }

        console.log(`✅ Invoice deleted: ${req.params.id}`);

        res.json({message: "Invoice berhasil dihapus"});
    })
);

// DOWNLOAD PDF
router.get(
    "/download/:invoice_number",
    asyncHandler(async (req, res) => {
        const {invoice_number} = req.params;

        const pdfPath = path.join(__dirname, "..", "invoices", `${invoice_number}.pdf`);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({error: "PDF tidak ditemukan"});
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${invoice_number}.pdf"`);
        res.sendFile(pdfPath);
    })
);

// SEND via WhatsApp
router.post(
    "/send/:id",
    asyncHandler(async (req, res) => {
        const invoice = await Invoice.findById(req.params.id).populate("customer_id");

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        const customer = invoice.customer_id;

        try {
            const message = `
🧾 *INVOICE TAGIHAN WIFI*

Halo ${customer.name},

📋 Detail Invoice:
• Invoice No: ${invoice.invoice_number}
• Paket: ${customer.package}
• Jumlah: Rp ${invoice.total_amount.toLocaleString("id-ID")}
• Jatuh Tempo: ${invoice.due_date.toLocaleDateString("id-ID")}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Terima kasih! 🙏
            `.trim();

            await axios.post(`${WHATSAPP_SERVICE_URL}/send-message`, {
                phone: customer.phone_whatsapp,
                message: message
            });

            invoice.status = "sent";
            invoice.sent_at = new Date();
            invoice.sent_via = "whatsapp";
            await invoice.save();

            console.log(`✅ Invoice sent to ${customer.phone_whatsapp}`);

            res.json({
                message: "Invoice berhasil dikirim via WhatsApp",
                data: invoice
            });
        } catch (error) {
            console.error("❌ Send WhatsApp failed:", error.message);
            res.status(500).json({
                error: "Gagal mengirim via WhatsApp",
                details: error.message
            });
        }
    })
);

// BULK SEND
router.post(
    "/bulk-send",
    asyncHandler(async (req, res) => {
        const {customer_ids, template_id, amount, due_date} = req.body;

        console.log(`📤 Bulk sending to ${customer_ids.length} customers...`);

        if (!customer_ids || customer_ids.length === 0 || !amount || !due_date) {
            return res.status(400).json({
                error: "customer_ids, amount, due_date wajib diisi"
            });
        }

        const results = [];

        for (const customer_id of customer_ids) {
            try {
                const customer = await Customer.findById(customer_id);

                if (!customer) {
                    results.push({
                        customer_id,
                        success: false,
                        error: "Customer tidak ditemukan"
                    });
                    continue;
                }

                // Generate invoice
                const invoiceNumber = await generateInvoiceNumber();
                const totalAmount = parseFloat(amount);
                const dueDateObj = new Date(due_date);

                const newInvoice = new Invoice({
                    invoice_number: invoiceNumber,
                    customer_id,
                    customer_name: customer.name,
                    customer_phone: customer.phone_whatsapp,
                    package: customer.package,
                    period_start: new Date(),
                    period_end: dueDateObj,
                    amount: totalAmount,
                    tax: 0,
                    total_amount: totalAmount,
                    due_date: dueDateObj,
                    status: "draft",
                    notes: ""
                });

                await newInvoice.save();

                // Send via WhatsApp
                const message = `
🧾 *INVOICE TAGIHAN WIFI*

Halo ${customer.name},

📋 Detail Invoice:
• Invoice No: ${invoiceNumber}
• Paket: ${customer.package}
• Jumlah: Rp ${totalAmount.toLocaleString("id-ID")}
• Jatuh Tempo: ${dueDateObj.toLocaleDateString("id-ID")}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Terima kasih! 🙏
                `.trim();

                await axios.post(`${WHATSAPP_SERVICE_URL}/send-message`, {
                    phone: customer.phone_whatsapp,
                    message: message
                });

                newInvoice.status = "sent";
                newInvoice.sent_at = new Date();
                newInvoice.sent_via = "whatsapp";
                await newInvoice.save();

                results.push({
                    customer_id,
                    customer_name: customer.name,
                    invoice_number: invoiceNumber,
                    success: true
                });

                console.log(`✅ Invoice sent to ${customer.name}`);
            } catch (error) {
                results.push({
                    customer_id,
                    success: false,
                    error: error.message
                });
                console.error(`❌ Failed for customer ${customer_id}:`, error.message);
            }
        }

        const successCount = results.filter(r => r.success).length;

        res.json({
            message: `${successCount}/${customer_ids.length} invoice berhasil dikirim`,
            results
        });
    })
);

export default router;
