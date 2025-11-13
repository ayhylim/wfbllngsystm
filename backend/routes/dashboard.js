import express from "express";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();

// GET dashboard statistics
router.get(
    "/",
    asyncHandler(async (req, res) => {
        // Total customers
        const totalCustomers = await Customer.countDocuments({status: "active"});

        // Active customers
        const activeCustomers = await Customer.countDocuments({status: "active"});

        // Suspended customers
        const suspendedCustomers = await Customer.countDocuments({status: "suspended"});

        // Total invoices
        const totalInvoices = await Invoice.countDocuments();

        // Paid invoices
        const paidInvoices = await Invoice.countDocuments({status: "paid"});

        // Pending invoices
        const pendingInvoices = await Invoice.countDocuments({
            status: {$in: ["draft", "sent", "viewed"]}
        });

        // Overdue invoices
        const overDueInvoices = await Invoice.countDocuments({
            status: "overdue",
            due_date: {$lt: new Date()}
        });

        // Revenue (total paid)
        const revenueResult = await Invoice.aggregate([
            {$match: {status: "paid"}},
            {$group: {_id: null, total: {$sum: "$total_amount"}}}
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        // Monthly revenue
        const monthlyRevenueResult = await Invoice.aggregate([
            {$match: {status: "paid"}},
            {
                $group: {
                    _id: {
                        year: {$year: "$payment_date"},
                        month: {$month: "$payment_date"}
                    },
                    total: {$sum: "$total_amount"}
                }
            },
            {$sort: {"_id.year": 1, "_id.month": 1}},
            {$limit: 12}
        ]);

        const monthlyRevenue = monthlyRevenueResult.map(item => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
            total: item.total
        }));

        // Status breakdown
        const statusBreakdown = await Invoice.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: {$sum: 1},
                    total_amount: {$sum: "$total_amount"}
                }
            }
        ]);

        // Recent invoices
        const recentInvoices = await Invoice.find().sort({created_at: -1}).limit(5);

        // Due this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const dueThisMonth = await Invoice.countDocuments({
            due_date: {
                $gte: startOfMonth,
                $lte: endOfMonth
            },
            status: {$ne: "paid"}
        });

        res.json({
            summary: {
                totalCustomers,
                activeCustomers,
                suspendedCustomers,
                totalInvoices,
                paidInvoices,
                pendingInvoices,
                overDueInvoices,
                totalRevenue,
                dueThisMonth
            },
            monthlyRevenue,
            statusBreakdown,
            recentInvoices
        });
    })
);

export default router;
