import express from "express";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import fs from "fs";
import Customer from "../models/Customer.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();
const upload = multer({dest: "uploads/"});

// GET semua customers + search
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const {q, status, page = 1, limit = 10} = req.query;

        const query = {};

        // Search by name, customer_id, phone, wifi_id
        if (q) {
            query.$or = [
                {name: {$regex: q, $options: "i"}},
                {customer_id: {$regex: q, $options: "i"}},
                {phone_whatsapp: {$regex: q, $options: "i"}},
                {wifi_id: {$regex: q, $options: "i"}}
            ];
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        const skip = (page - 1) * limit;

        const customers = await Customer.find(query).sort({created_at: -1}).skip(skip).limit(parseInt(limit));

        const total = await Customer.countDocuments(query);

        res.json({
            data: customers,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        });
    })
);

// GET single customer
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        res.json(customer);
    })
);

// CREATE customer
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const {
            customer_id,
            name,
            address,
            package: pkg,
            wifi_id,
            start_date,
            next_due_date,
            phone_whatsapp,
            status,
            notes
        } = req.body;

        // Validasi required fields
        if (!customer_id || !name || !address || !pkg || !wifi_id || !start_date || !next_due_date || !phone_whatsapp) {
            return res.status(400).json({error: "Semua field wajib diisi"});
        }

        const newCustomer = new Customer({
            customer_id,
            name,
            address,
            package: pkg,
            wifi_id,
            start_date: new Date(start_date),
            next_due_date: new Date(next_due_date),
            phone_whatsapp,
            status: status || "active",
            notes: notes || ""
        });

        await newCustomer.save();

        res.status(201).json({
            message: "Customer berhasil ditambah",
            data: newCustomer
        });
    })
);

// UPDATE customer
router.put(
    "/:id",
    asyncHandler(async (req, res) => {
        const {
            customer_id,
            name,
            address,
            package: pkg,
            wifi_id,
            start_date,
            next_due_date,
            phone_whatsapp,
            status,
            notes
        } = req.body;

        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        // Update fields
        customer.customer_id = customer_id || customer.customer_id;
        customer.name = name || customer.name;
        customer.address = address || customer.address;
        customer.package = pkg || customer.package;
        customer.wifi_id = wifi_id || customer.wifi_id;
        customer.start_date = start_date ? new Date(start_date) : customer.start_date;
        customer.next_due_date = next_due_date ? new Date(next_due_date) : customer.next_due_date;
        customer.phone_whatsapp = phone_whatsapp || customer.phone_whatsapp;
        customer.status = status || customer.status;
        customer.notes = notes !== undefined ? notes : customer.notes;

        await customer.save();

        res.json({
            message: "Customer berhasil diupdate",
            data: customer
        });
    })
);

// DELETE customer
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        const customer = await Customer.findByIdAndDelete(req.params.id);

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        res.json({message: "Customer berhasil dihapus"});
    })
);

// IMPORT CSV/EXCEL
router.post(
    "/import",
    upload.single("file"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({error: "File tidak ditemukan"});
        }

        const filePath = req.file.path;
        const fileExt = req.file.originalname.split(".").pop().toLowerCase();

        let data = [];
        let errors = [];

        try {
            if (fileExt === "csv") {
                // Parse CSV
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const parseResult = Papa.parse(fileContent, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: false
                });

                data = parseResult.data;
            } else if (fileExt === "xlsx" || fileExt === "xls") {
                // Parse Excel
                const workbook = XLSX.readFile(filePath);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(worksheet);
            } else {
                return res.status(400).json({error: "Format file tidak didukung (CSV/XLSX saja)"});
            }

            // Import data
            let imported = 0;

            for (let i = 0; i < data.length; i++) {
                const row = data[i];

                try {
                    // Trim whitespace
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        cleanRow[key.trim()] = typeof row[key] === "string" ? row[key].trim() : row[key];
                    });

                    // Validasi required fields
                    if (!cleanRow.customer_id || !cleanRow.name || !cleanRow.wifi_id) {
                        errors.push(`Row ${i + 2}: customer_id, name, wifi_id wajib diisi`);
                        continue;
                    }

                    // Check duplicate
                    const exists = await Customer.findOne({
                        $or: [{customer_id: cleanRow.customer_id}, {wifi_id: cleanRow.wifi_id}]
                    });

                    if (exists) {
                        errors.push(`Row ${i + 2}: customer_id atau wifi_id sudah ada`);
                        continue;
                    }

                    const newCustomer = new Customer({
                        customer_id: cleanRow.customer_id,
                        name: cleanRow.name,
                        address: cleanRow.address || "N/A",
                        package: cleanRow.package || "Standard",
                        wifi_id: cleanRow.wifi_id,
                        start_date: cleanRow.start_date ? new Date(cleanRow.start_date) : new Date(),
                        next_due_date: cleanRow.next_due_date
                            ? new Date(cleanRow.next_due_date)
                            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        phone_whatsapp: cleanRow.phone_whatsapp || "62812345678",
                        status: cleanRow.status || "active",
                        notes: cleanRow.notes || ""
                    });

                    await newCustomer.save();
                    imported++;
                } catch (err) {
                    errors.push(`Row ${i + 2}: ${err.message}`);
                }
            }

            res.json({
                message: `${imported} pelanggan berhasil diimport`,
                imported,
                errors,
                total_rows: data.length
            });
        } catch (error) {
            res.status(500).json({
                error: "Gagal mengimport file",
                details: error.message
            });
        } finally {
            // Cleanup file
            fs.unlinkSync(filePath);
        }
    })
);

export default router;
