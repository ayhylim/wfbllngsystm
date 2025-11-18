import mongoose from "mongoose";

const invoiceTemplateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            default: "Invoice Pembayaran WiFi"
        },
        body: {
            type: String,
            required: true,
            default: `Halo {customer_name},

Berikut detail invoice Anda:

Periode: {period}
Paket: {package}
Harga: Rp {amount}
Jatuh Tempo: {due_date}

Silakan lakukan pembayaran sebelum tanggal jatuh tempo.

Terima kasih,
WiFi Angkasa`
        },
        variables: {
            type: [String],
            default: ["customer_name", "customer_id", "package", "amount", "period", "due_date", "phone_whatsapp"]
        },
        is_default: {
            type: Boolean,
            default: false
        },
        is_active: {
            type: Boolean,
            default: true
        },
        // Untuk multi-user di future
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
        collection: "invoice_templates"
    }
);

const InvoiceTemplate = mongoose.model("InvoiceTemplate", invoiceTemplateSchema);

export default InvoiceTemplate;
