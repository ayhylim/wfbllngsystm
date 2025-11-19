import mongoose from "mongoose";
import {customAlphabet} from "nanoid";

// Generate numeric-only nanoid for customer_id
const nanoid = customAlphabet("0123456789", 10);

const customerSchema = new mongoose.Schema(
    {
        customer_id: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
            default: () => nanoid() // Auto-generate 10-digit numeric ID
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        package: {
            type: String,
            required: true,
            trim: true
        },
        wifi_id: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },

        // ========== NEW FIELDS ==========

        // ONE-TIME Costs
        router_purchase_price: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        registration_fee: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        installation_discount: {
            type: Number,
            default: 0,
            min: 0
        },
        other_fees: {
            type: Number,
            default: 0,
            min: 0
        },

        // Subscription Period
        subscription_start_date: {
            type: Date,
            required: true,
            index: true
        },

        // Billing Info
        next_due_date: {
            type: Date,
            required: true,
            index: true
        },
        last_payment_date: {
            type: Date,
            default: null,
            index: true
        },
        last_payment_amount: {
            type: Number,
            default: 0
        },

        // ========== END NEW FIELDS ==========

        phone_whatsapp: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        status: {
            type: String,
            enum: ["active", "suspended", "cancelled"],
            default: "active",
            index: true
        },
        notes: {
            type: String,
            default: "",
            trim: true
        },

        // Financial Tracking
        total_paid: {
            type: Number,
            default: 0
        },
        total_due: {
            type: Number,
            default: 0
        },
        last_invoice_date: {
            type: Date,
            default: null
        },

        // Metadata
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
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
        collection: "customers"
    }
);

// Index untuk search
customerSchema.index({
    name: "text",
    customer_id: "text",
    phone_whatsapp: "text",
    wifi_id: "text"
});

customerSchema.index({user_id: 1, status: 1});
customerSchema.index({user_id: 1, createdAt: -1});

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
