import express from "express";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();

// GET dashboard statistics
router.get(
    "/stats",
    asyncHandler(async (req, res) => {
        console.log("📊 Fetching dashboard stats...");

        // Total customers
        const totalCustomers = await Customer.countDocuments();

        // Active customers
        const activeCustomers = await Customer.countDocuments({status: "active"});

        // Suspended customers
        const suspendedCustomers = await Customer.countDocuments({status: "suspended"});

        // Total invoices
        const totalInvoices = await Invoice.countDocuments();

        // Paid invoices
        const paidInvoices = await Invoice.countDocuments({status: "paid"});

        // Sent invoices
        const sentInvoices = await Invoice.countDocuments({status: "sent"});

        // Pending invoices
        const pendingInvoices = await Invoice.countDocuments({
            status: {$in: ["draft", "sent"]}
        });

        // Overdue invoices
        const now = new Date();
        const overdueInvoices = await Invoice.countDocuments({
            status: {$ne: "paid"},
            due_date: {$lt: now}
        });

        // Revenue (total paid)
        const revenueResult = await Invoice.aggregate([
            {$match: {status: "paid"}},
            {$group: {_id: null, total: {$sum: "$total_amount"}}}
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        console.log(`✅ Dashboard stats calculated`);

        res.json({
            customers: {
                total: totalCustomers,
                active: activeCustomers,
                suspended: suspendedCustomers
            },
            invoices: {
                total: totalInvoices,
                paid: paidInvoices,
                sent: sentInvoices,
                pending: pendingInvoices,
                overdue: overdueInvoices
            },
            revenue: totalRevenue
        });
    })
);

// GET overdue invoices
router.get(
    "/overdue",
    asyncHandler(async (req, res) => {
        console.log("⏰ Fetching overdue invoices...");

        const now = new Date();

        const overdueInvoices = await Invoice.find({
            status: {$ne: "paid"},
            due_date: {$lt: now}
        })
            .populate("customer_id")
            .sort({due_date: 1})
            .limit(50);

        const formatted = overdueInvoices.map(inv => ({
            id: inv._id,
            invoice_number: inv.invoice_number,
            customer_id: inv.customer_id?._id,
            customer_name: inv.customer_name,
            amount: inv.total_amount,
            due_date: inv.due_date.toLocaleDateString("id-ID"),
            status: inv.status,
            phone: inv.customer_phone
        }));

        console.log(`✅ Found ${formatted.length} overdue invoices`);

        res.json(formatted);
    })
);

export default router;
