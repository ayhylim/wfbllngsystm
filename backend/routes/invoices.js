import express from "express";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import InvoiceTemplate from "../models/InvoiceTemplate.js";
import {asyncHandler} from "../middleware/errorHandler.js";
import {generateInvoicePDF} from "../utils/pdfGenerator.js";
import axios from "axios";

const router = express.Router();

// GET semua invoices + filter
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const {customer_id, status, page = 1, limit = 10, start_date, end_date} = req.query;

        const query = {};

        if (customer_id) query.customer_id = customer_id;
        if (status) query.status = status;

        if (start_date || end_date) {
            query.created_at = {};
            if (start_date) query.created_at.$gte = new Date(start_date);
            if (end_date) query.created_at.$lte = new Date(end_date);
        }

        const skip = (page - 1) * limit;

        const invoices = await Invoice.find(query).sort({created_at: -1}).skip(skip).limit(parseInt(limit));

        const total = await Invoice.countDocuments(query);

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

// CREATE invoice
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const {customer_id, period_start, period_end, amount, tax = 0, notes = ""} = req.body;

        if (!customer_id || !period_start || !period_end || !amount) {
            return res.status(400).json({
                error: "customer_id, period_start, period_end, amount wajib diisi"
            });
        }

        const customer = await Customer.findById(customer_id);

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        // Generate invoice number
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const count = await Invoice.countDocuments();
        const invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(4, "0")}`;

        const totalAmount = parseFloat(amount) + parseFloat(tax);

        const newInvoice = new Invoice({
            invoice_number: invoiceNumber,
            customer_id,
            customer_name: customer.name,
            customer_phone: customer.phone_whatsapp,
            package: customer.package,
            period_start: new Date(period_start),
            period_end: new Date(period_end),
            amount: parseFloat(amount),
            tax: parseFloat(tax),
            total_amount: totalAmount,
            due_date: new Date(period_end),
            status: "draft",
            notes
        });

        await newInvoice.save();

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
                customer.total_paid += invoice.total_amount;
                customer.last_payment_date = new Date();
                await customer.save();
            }
        }

        await invoice.save();

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
        const invoice = await Invoice.findByIdAndDelete(req.params.id);

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        res.json({message: "Invoice berhasil dihapus"});
    })
);

// GENERATE PDF
router.get(
    "/:id/pdf",
    asyncHandler(async (req, res) => {
        const invoice = await Invoice.findById(req.params.id).populate("customer_id");

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        const pdfBuffer = await generateInvoicePDF(invoice);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="Invoice_${invoice.invoice_number}.pdf"`);
        res.send(pdfBuffer);
    })
);

// SEND via WhatsApp
router.post(
    "/:id/send",
    asyncHandler(async (req, res) => {
        const invoice = await Invoice.findById(req.params.id).populate("customer_id");

        if (!invoice) {
            return res.status(404).json({error: "Invoice tidak ditemukan"});
        }

        try {
            // Generate PDF
            const pdfBuffer = await generateInvoicePDF(invoice);

            // Get template
            const template = await InvoiceTemplate.findOne({is_default: true});
            const messageBody =
                template?.body || "Invoice sudah disiapkan, silakan hubungi kami untuk detail lebih lanjut";

            // Send to WhatsApp
            const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL || "http://localhost:8002";

            // Replace variables
            const finalMessage = messageBody
                .replace("{customer_name}", invoice.customer_name)
                .replace(
                    "{period}",
                    `${invoice.period_start.toLocaleDateString("id-ID")} - ${invoice.period_end.toLocaleDateString(
                        "id-ID"
                    )}`
                )
                .replace("{package}", invoice.package)
                .replace("{amount}", invoice.total_amount.toLocaleString("id-ID"))
                .replace("{due_date}", invoice.due_date.toLocaleDateString("id-ID"))
                .replace("{phone_whatsapp}", invoice.customer_phone);

            // Send text message
            await axios.post(`${whatsappServiceUrl}/send-message`, {
                phone: invoice.customer_phone,
                message: finalMessage
            });

            // Update invoice status
            invoice.status = "sent";
            invoice.sent_at = new Date();
            invoice.sent_via = "whatsapp";
            await invoice.save();

            res.json({
                message: "Invoice berhasil dikirim via WhatsApp",
                data: invoice
            });
        } catch (error) {
            console.error("WhatsApp send error:", error.message);
            res.status(500).json({
                error: "Gagal mengirim via WhatsApp",
                details: error.message
            });
        }
    })
);

export default router;
