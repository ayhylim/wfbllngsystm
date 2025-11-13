import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        customer_id: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
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
        start_date: {
            type: Date,
            required: true
        },
        next_due_date: {
            type: Date,
            required: true,
            index: true
        },
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
        total_paid: {
            type: Number,
            default: 0
        },
        total_due: {
            type: Number,
            default: 0
        },
        last_payment_date: {
            type: Date,
            default: null
        },
        last_invoice_date: {
            type: Date,
            default: null
        },
        // Untuk multi-user di future (Google Auth)
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        // Metadata
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

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
