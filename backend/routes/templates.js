import express from "express";
import InvoiceTemplate from "../models/InvoiceTemplate.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();

// GET semua templates
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const templates = await InvoiceTemplate.find({is_active: true}).sort({
            is_default: -1,
            created_at: -1
        });

        res.json(templates);
    })
);

// GET single template
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const template = await InvoiceTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({error: "Template tidak ditemukan"});
        }

        res.json(template);
    })
);

// CREATE template
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const {name, subject, body, is_default} = req.body;

        if (!name || !subject || !body) {
            return res.status(400).json({error: "name, subject, body wajib diisi"});
        }

        // Jika is_default true, unset default lainnya
        if (is_default) {
            await InvoiceTemplate.updateMany({is_default: true}, {is_default: false});
        }

        const newTemplate = new InvoiceTemplate({
            name,
            subject,
            body,
            is_default: is_default || false,
            is_active: true
        });

        await newTemplate.save();

        res.status(201).json({
            message: "Template berhasil dibuat",
            data: newTemplate
        });
    })
);

// UPDATE template
router.put(
    "/:id",
    asyncHandler(async (req, res) => {
        const {name, subject, body, is_default, is_active} = req.body;

        const template = await InvoiceTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({error: "Template tidak ditemukan"});
        }

        // Update fields
        template.name = name || template.name;
        template.subject = subject || template.subject;
        template.body = body || template.body;
        template.is_active = is_active !== undefined ? is_active : template.is_active;

        // Jika set default, unset default lainnya
        if (is_default === true && !template.is_default) {
            await InvoiceTemplate.updateMany({is_default: true}, {is_default: false});
            template.is_default = true;
        }

        await template.save();

        res.json({
            message: "Template berhasil diupdate",
            data: template
        });
    })
);

// DELETE template
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        const template = await InvoiceTemplate.findByIdAndDelete(req.params.id);

        if (!template) {
            return res.status(404).json({error: "Template tidak ditemukan"});
        }

        res.json({message: "Template berhasil dihapus"});
    })
);

export default router;
