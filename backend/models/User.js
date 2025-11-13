import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        google_id: {
            type: String,
            default: null,
            unique: true,
            sparse: true
        },
        avatar_url: {
            type: String,
            default: null
        },
        phone: {
            type: String,
            default: null,
            trim: true
        },
        role: {
            type: String,
            enum: ["admin", "operator"],
            default: "operator"
        },
        company_name: {
            type: String,
            default: "WiFi Angkasa"
        },
        is_active: {
            type: Boolean,
            default: true
        },
        last_login: {
            type: Date,
            default: null
        },
        preferences: {
            theme: {
                type: String,
                enum: ["light", "dark"],
                default: "light"
            },
            language: {
                type: String,
                default: "id"
            },
            notifications_enabled: {
                type: Boolean,
                default: true
            }
        }
    },
    {
        timestamps: true,
        collection: "users"
    }
);

const User = mongoose.model("User", userSchema);

export default User;
