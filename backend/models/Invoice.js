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
        status: {
            type: String,
            enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"],
            default: "draft",
            index: true
        },
        payment_date: {
            type: Date
            // REMOVED default: null - undefined is better for optional fields
        },
        payment_method: {
            type: String,
            enum: ["cash", "transfer", "check", "other"]
            // REMOVED default: null - only set when payment is made
        },
        notes: {
            type: String,
            default: "",
            trim: true
        },
        pdf_url: {
            type: String
            // REMOVED default: null
        },
        sent_at: {
            type: Date
            // REMOVED default: null
        },
        sent_via: {
            type: String,
            enum: ["whatsapp", "email", "manual"]
            // REMOVED default: null - only set when actually sent
        },
        // Untuk multi-user di future
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
            // REMOVED default: null
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

// Index untuk query yang sering
invoiceSchema.index({customer_id: 1, createdAt: -1});
invoiceSchema.index({status: 1, due_date: 1});
invoiceSchema.index({invoice_number: 1});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
