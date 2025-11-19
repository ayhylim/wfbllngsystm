import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
    {
        invoice_number: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        payment_receipt_number: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            index: true
        },
        customer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true
        },
        customer_name: {
            type: String,
            required: true
        },
        customer_phone: {
            type: String,
            required: true
        },
        package: {
            type: String,
            required: true
        },
        period_start: {
            type: Date,
            required: true
        },
        period_end: {
            type: Date,
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        router_cost: {
            type: Number,
            default: 0,
            min: 0
        },
        installation_cost: {
            type: Number,
            default: 0,
            min: 0
        },
        other_fees: {
            type: Number,
            default: 0,
            min: 0
        },
        installation_discount: {
            type: Number,
            default: 0,
            min: 0
        },
        tax: {
            type: Number,
            default: 0,
            min: 0
        },
        total_amount: {
            type: Number,
            required: true,
            min: 0
        },
        due_date: {
            type: Date,
            required: true,
            index: true
        },
        invoice_date: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"],
            default: "draft",
            index: true
        },
        payment_received_date: {
            type: Date
        },
        payment_method: {
            type: String,
            enum: ["cash", "transfer", "check", "other"]
        },
        received_by: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            default: "",
            trim: true
        },
        pdf_url: {
            type: String
        },
        sent_at: {
            type: Date
        },
        sent_via: {
            type: String,
            enum: ["whatsapp", "email", "manual"]
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true, // ← REQUIRED for multi-tenancy
            index: true
        },
        created_by: {
            type: String,
            default: "admin"
        },
        updated_by: {
            type: String,
            default: "admin"
        }
    },
    {
        timestamps: true,
        collection: "invoices"
    }
);

// ========== INDEXES for multi-tenant queries ==========
invoiceSchema.index({user_id: 1, customer_id: 1, createdAt: -1});
invoiceSchema.index({user_id: 1, status: 1, due_date: 1});
invoiceSchema.index({user_id: 1, invoice_number: 1});
invoiceSchema.index({user_id: 1, payment_receipt_number: 1});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
