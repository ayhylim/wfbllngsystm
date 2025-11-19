import express from "express";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();

// ========== GET dashboard statistics milik user ini ==========
router.get(
    "/stats",
    asyncHandler(async (req, res) => {
        console.log("📊 Fetching dashboard stats for user:", req.user.email);

        const userFilter = {user_id: req.user.id}; // ← BASE FILTER

        // Total customers
        const totalCustomers = await Customer.countDocuments(userFilter);

        // Active customers
        const activeCustomers = await Customer.countDocuments({
            ...userFilter,
            status: "active"
        });

        // Suspended customers
        const suspendedCustomers = await Customer.countDocuments({
            ...userFilter,
            status: "suspended"
        });

        // Total invoices
        const totalInvoices = await Invoice.countDocuments(userFilter);

        // Paid invoices
        const paidInvoices = await Invoice.countDocuments({
            ...userFilter,
            status: "paid"
        });

        // Sent invoices
        const sentInvoices = await Invoice.countDocuments({
            ...userFilter,
            status: "sent"
        });

        // Pending invoices
        const pendingInvoices = await Invoice.countDocuments({
            ...userFilter,
            status: {$in: ["draft", "sent"]}
        });

        // Overdue invoices
        const now = new Date();
        const overdueInvoices = await Invoice.countDocuments({
            ...userFilter,
            status: {$ne: "paid"},
            due_date: {$lt: now}
        });

        // Revenue (total paid)
        const revenueResult = await Invoice.aggregate([
            {
                $match: {
                    user_id: req.user.id, // ← FILTER BY USER
                    status: "paid"
                }
            },
            {$group: {_id: null, total: {$sum: "$total_amount"}}}
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        console.log(`✅ Dashboard stats calculated for ${req.user.email}`);

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

// ========== GET overdue invoices milik user ini ==========
router.get(
    "/overdue",
    asyncHandler(async (req, res) => {
        console.log("⏰ Fetching overdue invoices for user:", req.user.email);

        const now = new Date();

        const overdueInvoices = await Invoice.find({
            user_id: req.user.id, // ← FILTER BY USER
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

        console.log(`✅ Found ${formatted.length} overdue invoices for ${req.user.email}`);

        res.json(formatted);
    })
);

export default router;
