import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        description: {
            type: String,
            default: ""
        },
        data_type: {
            type: String,
            enum: ["string", "number", "boolean", "array", "object"],
            default: "string"
        },
        // Untuk multi-user di future
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true,
        collection: "settings"
    }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
