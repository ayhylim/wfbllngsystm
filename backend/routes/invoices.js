import express from "express";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import InvoiceTemplate from "../models/InvoiceTemplate.js";
import {asyncHandler} from "../middleware/errorHandler.js";
import {generateInvoicePDF, savePDFToDisk} from "../utils/pdfGenerator.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import FormData from "form-data";
import {customAlphabet} from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:8002";

const nanoid = customAlphabet("0123456789", 10);
const generatePaymentReceiptNumber = () => nanoid();

const generateInvoiceNumber = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `INV-${year}${month}${day}-${random}`;
};

// ========== GET all invoices milik user ini ==========
router.get(
    "/",
    asyncHandler(async (req, res) => {
        try {
            const {customer_id, status, page = 1, limit = 100, start_date, end_date, q} = req.query;

            const query = {
                user_id: req.user.id // ← FILTER BY USER
            };

            if (customer_id) query.customer_id = customer_id;
            if (status) query.status = status;

            // Search query
            if (q) {
                query.$or = [
                    {invoice_number: {$regex: q, $options: "i"}},
                    {payment_receipt_number: {$regex: q, $options: "i"}},
                    {customer_name: {$regex: q, $options: "i"}}
                ];
            }

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
                .limit(parseInt(limit))
                .lean();

            const total = await Invoice.countDocuments(query);

            console.log(`✅ Fetched ${invoices.length} invoices for user ${req.user.email}`);

            res.json({
                data: invoices,
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            });
        } catch (error) {
            console.error("❌ GET /invoices error:", error);
            res.status(500).json({
                error: "Gagal mengambil data invoice",
                details: error.message
            });
        }
    })
);

// GET single invoice
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        }).populate("customer_id");

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        res.json(invoice);
    })
);

// ========== GENERATE invoice ==========
router.post(
    "/generate",
    asyncHandler(async (req, res) => {
        const {
            customer_id,
            template_id,
            amount,
            due_date,
            send_whatsapp,
            payment_method,
            payment_received_date,
            received_by,
            notes,
            include_router_cost,
            include_installation_cost
        } = req.body;

        console.log("📝 Generating invoice for customer:", customer_id, "by", req.user.email);

        if (!customer_id || !amount) {
            return res.status(400).json({
                error: "customer_id dan amount wajib diisi"
            });
        }

        // GET customer - CHECK if belongs to user
        const customer = await Customer.findOne({
            _id: customer_id,
            user_id: req.user.id // ← SECURITY
        });

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan di akun Anda"});
        }

        // Generate invoice number & payment receipt number
        const invoiceNumber = await generateInvoiceNumber();
        const paymentReceiptNumber = generatePaymentReceiptNumber();

        const monthlyAmount = parseFloat(amount);
        const dueDate = due_date ? new Date(due_date) : new Date(customer.next_due_date);

        // Calculate additional costs
        let routerCost = 0;
        let installationCost = 0;

        if (include_router_cost) {
            routerCost = customer.router_purchase_price || 0;
        }

        if (include_installation_cost) {
            installationCost = (customer.registration_fee || 0) + (customer.other_fees || 0);
        }

        const installationDiscount = customer.installation_discount || 0;

        const totalAmount = monthlyAmount + routerCost + installationCost - installationDiscount;

        const newInvoice = new Invoice({
            invoice_number: invoiceNumber,
            payment_receipt_number: paymentReceiptNumber,
            customer_id,
            customer_name: customer.name,
            customer_phone: customer.phone_whatsapp,
            package: customer.package,
            period_start: new Date(),
            period_end: dueDate,
            amount: monthlyAmount,
            router_cost: routerCost,
            installation_cost: installationCost,
            other_fees: 0,
            installation_discount: installationDiscount,
            tax: 0,
            total_amount: totalAmount,
            due_date: dueDate,
            invoice_date: new Date(),
            status: payment_method ? "paid" : "draft",
            payment_method: payment_method || undefined,
            payment_received_date: payment_received_date ? new Date(payment_received_date) : undefined,
            received_by: received_by || undefined,
            notes: notes || "",
            user_id: req.user.id, // ← ASSIGN TO USER
            created_by: req.user.email
        });

        await newInvoice.save();

        console.log(`✅ Invoice created: ${newInvoice.invoice_number}`);

        // Generate PDF
        try {
            console.log("🔄 Generating PDF...");
            const pdfBuffer = await generateInvoicePDF(newInvoice, customer);
            const pdfPath = await savePDFToDisk(pdfBuffer, invoiceNumber);

            newInvoice.pdf_url = `/invoices/${invoiceNumber}.pdf`;
            await newInvoice.save();

            console.log(`✅ PDF saved: ${pdfPath}`);
        } catch (error) {
            console.error("❌ PDF generation failed:", error);
            return res.status(500).json({
                error: "Gagal generate PDF",
                details: error.message
            });
        }

        // Send via WhatsApp if requested
        if (send_whatsapp) {
            try {
                console.log("📤 Sending via WhatsApp...");
                await sendInvoiceViaWhatsApp(newInvoice, customer);

                newInvoice.status = "sent";
                newInvoice.sent_at = new Date();
                newInvoice.sent_via = "whatsapp";
                await newInvoice.save();

                console.log(`✅ Invoice sent via WhatsApp`);
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

// ========== UPDATE invoice (FULL EDIT) ==========
router.put(
    "/:id",
    asyncHandler(async (req, res) => {
        const {
            customer_id,
            amount,
            router_cost,
            installation_cost,
            other_fees,
            installation_discount,
            tax,
            status,
            due_date,
            payment_received_date,
            payment_method,
            received_by,
            notes
        } = req.body;

        console.log(`📝 Updating invoice: ${req.params.id}`);

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        });

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        // Update customer if changed
        if (customer_id && customer_id !== invoice.customer_id.toString()) {
            const customer = await Customer.findOne({
                _id: customer_id,
                user_id: req.user.id // ← SECURITY
            });
            if (!customer) {
                return res.status(404).json({error: "Customer tidak ditemukan di akun Anda"});
            }
            invoice.customer_id = customer_id;
            invoice.customer_name = customer.name;
            invoice.customer_phone = customer.phone_whatsapp;
            invoice.package = customer.package;
        }

        // Update amounts
        if (amount !== undefined) invoice.amount = parseFloat(amount);
        if (router_cost !== undefined) invoice.router_cost = parseFloat(router_cost);
        if (installation_cost !== undefined) invoice.installation_cost = parseFloat(installation_cost);
        if (other_fees !== undefined) invoice.other_fees = parseFloat(other_fees);
        if (installation_discount !== undefined) invoice.installation_discount = parseFloat(installation_discount);
        if (tax !== undefined) invoice.tax = parseFloat(tax);

        // Recalculate total
        invoice.total_amount =
            invoice.amount +
            invoice.router_cost +
            invoice.installation_cost +
            invoice.other_fees -
            invoice.installation_discount +
            invoice.tax;

        // Update other fields
        if (status) invoice.status = status;
        if (due_date) invoice.due_date = new Date(due_date);
        if (payment_received_date) invoice.payment_received_date = new Date(payment_received_date);
        if (payment_method) invoice.payment_method = payment_method;
        if (received_by) invoice.received_by = received_by;
        if (notes !== undefined) invoice.notes = notes;

        invoice.updated_by = req.user.email;

        await invoice.save();

        // Regenerate PDF
        try {
            const customer = await Customer.findById(invoice.customer_id);
            const pdfBuffer = await generateInvoicePDF(invoice, customer);
            await savePDFToDisk(pdfBuffer, invoice.invoice_number);
            console.log(`✅ PDF regenerated for ${invoice.invoice_number}`);
        } catch (error) {
            console.error("❌ PDF regeneration failed:", error);
        }

        console.log(`✅ Invoice updated: ${invoice._id}`);

        res.json({
            message: "Invoice berhasil diupdate",
            data: invoice
        });
    })
);

// ========== MARK AS PAID ==========
router.patch(
    "/:id/mark-paid",
    asyncHandler(async (req, res) => {
        const {payment_method, payment_received_date, received_by} = req.body;

        console.log(`💰 Marking invoice as paid: ${req.params.id}`);

        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        });

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        // Update invoice status to PAID
        invoice.status = "paid";
        invoice.payment_method = payment_method || "cash";
        invoice.payment_received_date = payment_received_date ? new Date(payment_received_date) : new Date();
        invoice.received_by = received_by || "admin";
        invoice.updated_by = req.user.email;

        await invoice.save();

        console.log(`✅ Invoice ${invoice.invoice_number} marked as paid in DATABASE`);

        // Update customer's last payment info
        try {
            const customer = await Customer.findOne({
                _id: invoice.customer_id,
                user_id: req.user.id
            });
            if (customer) {
                customer.last_payment_date = invoice.payment_received_date;
                customer.last_payment_amount = invoice.total_amount;
                await customer.save();
                console.log(`✅ Customer payment info updated`);
            }
        } catch (error) {
            console.error("⚠️ Failed to update customer payment info:", error);
        }

        res.json({
            message: "Invoice berhasil ditandai sebagai lunas",
            data: invoice
        });
    })
);

// DELETE invoice
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        console.log(`🗑️ Deleting invoice: ${req.params.id}`);

        const invoice = await Invoice.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        });

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        // Delete PDF file
        if (invoice.pdf_url) {
            const pdfPath = path.join(__dirname, "..", "invoices", `${invoice.invoice_number}.pdf`);
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

        // Verify invoice belongs to user
        const invoice = await Invoice.findOne({
            invoice_number,
            user_id: req.user.id // ← SECURITY
        });

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        const pdfPath = path.join(__dirname, "..", "invoices", `${invoice_number}.pdf`);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({error: "PDF tidak ditemukan"});
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${invoice_number}.pdf"`);
        res.sendFile(pdfPath);
    })
);

// SEND via WhatsApp (single)
router.post(
    "/send/:id",
    asyncHandler(async (req, res) => {
        const invoice = await Invoice.findOne({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        }).populate("customer_id");

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        const customer = invoice.customer_id;

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        try {
            await sendInvoiceViaWhatsApp(invoice, customer);

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

        console.log(`📤 Bulk sending to ${customer_ids.length} customers by ${req.user.email}...`);

        if (!customer_ids || customer_ids.length === 0 || !amount || !due_date) {
            return res.status(400).json({
                error: "customer_ids, amount, due_date wajib diisi"
            });
        }

        const results = [];

        for (const customer_id of customer_ids) {
            try {
                // Verify customer belongs to user
                const customer = await Customer.findOne({
                    _id: customer_id,
                    user_id: req.user.id // ← SECURITY
                });

                if (!customer) {
                    results.push({
                        customer_id,
                        success: false,
                        error: "Customer tidak ditemukan di akun Anda"
                    });
                    continue;
                }

                const invoiceNumber = await generateInvoiceNumber();
                const paymentReceiptNumber = generatePaymentReceiptNumber();
                const totalAmount = parseFloat(amount);
                const dueDateObj = new Date(due_date);

                const newInvoice = new Invoice({
                    invoice_number: invoiceNumber,
                    payment_receipt_number: paymentReceiptNumber,
                    customer_id,
                    customer_name: customer.name,
                    customer_phone: customer.phone_whatsapp,
                    package: customer.package,
                    period_start: new Date(),
                    period_end: dueDateObj,
                    amount: totalAmount,
                    router_cost: 0,
                    installation_cost: 0,
                    other_fees: 0,
                    installation_discount: 0,
                    tax: 0,
                    total_amount: totalAmount,
                    due_date: dueDateObj,
                    invoice_date: new Date(),
                    status: "draft",
                    notes: "",
                    user_id: req.user.id, // ← ASSIGN TO USER
                    created_by: req.user.email
                });

                await newInvoice.save();

                const pdfBuffer = await generateInvoicePDF(newInvoice, customer);
                await savePDFToDisk(pdfBuffer, invoiceNumber);

                newInvoice.pdf_url = `/invoices/${invoiceNumber}.pdf`;
                await newInvoice.save();

                await sendInvoiceViaWhatsApp(newInvoice, customer);

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

// Helper function to send invoice via WhatsApp
async function sendInvoiceViaWhatsApp(invoice, customer) {
    const pdfPath = path.join(__dirname, "..", "invoices", `${invoice.invoice_number}.pdf`);

    if (!fs.existsSync(pdfPath)) {
        throw new Error("PDF file not found");
    }

    const message = `
🧾 *INVOICE TAGIHAN WIFI*

Halo ${customer.name},

📋 Detail Invoice:
• Invoice No: ${invoice.invoice_number}
• No. Bukti: ${invoice.payment_receipt_number}
• Paket: ${customer.package}
• Jumlah: Rp ${invoice.total_amount.toLocaleString("id-ID")}
• Jatuh Tempo: ${new Date(invoice.due_date).toLocaleDateString("id-ID")}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Terima kasih! 🙏
    `.trim();

    const formData = new FormData();
    formData.append("phone", customer.phone_whatsapp);
    formData.append("caption", message);
    formData.append("file", fs.createReadStream(pdfPath), {
        filename: `${invoice.invoice_number}.pdf`,
        contentType: "application/pdf"
    });

    await axios.post(`${WHATSAPP_SERVICE_URL}/send-document`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
    });
}

export default router;
