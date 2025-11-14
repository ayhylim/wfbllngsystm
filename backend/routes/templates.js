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
            createdAt: -1
        });

        console.log(`✅ Fetched ${templates.length} templates`);

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
        const {name, html_content, is_default} = req.body;

        console.log("📝 Creating template:", name);

        if (!name || !html_content) {
            return res.status(400).json({error: "name dan html_content wajib diisi"});
        }

        // Jika is_default true, unset default lainnya
        if (is_default) {
            await InvoiceTemplate.updateMany({is_default: true}, {is_default: false});
            console.log("🔄 Unset previous default template");
        }

        const newTemplate = new InvoiceTemplate({
            name,
            subject: `Invoice - ${name}`,
            body: html_content, // Store HTML in body field
            is_default: is_default || false,
            is_active: true
        });

        await newTemplate.save();

        console.log(`✅ Template created: ${newTemplate._id}`);

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
        const {name, html_content, is_default, is_active} = req.body;

        console.log(`📝 Updating template: ${req.params.id}`);

        const template = await InvoiceTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({error: "Template tidak ditemukan"});
        }

        // Update fields
        if (name) template.name = name;
        if (html_content) template.body = html_content;
        if (is_active !== undefined) template.is_active = is_active;

        // Jika set default, unset default lainnya
        if (is_default === true && !template.is_default) {
            await InvoiceTemplate.updateMany({is_default: true}, {is_default: false});
            template.is_default = true;
            console.log("🔄 Set as new default template");
        }

        await template.save();

        console.log(`✅ Template updated: ${template._id}`);

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
        console.log(`🗑️ Deleting template: ${req.params.id}`);

        const template = await InvoiceTemplate.findByIdAndDelete(req.params.id);

        if (!template) {
            return res.status(404).json({error: "Template tidak ditemukan"});
        }

        console.log(`✅ Template deleted: ${req.params.id}`);

        res.json({message: "Template berhasil dihapus"});
    })
);

export default router;
