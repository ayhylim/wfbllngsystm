import express from "express";
import multer from "multer";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import fs from "fs";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import {asyncHandler} from "../middleware/errorHandler.js";

const router = express.Router();
const upload = multer({dest: "uploads/"});

// ========== MULTI-TENANT: GET semua customers milik user ini saja ==========
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const {q, status, page = 1, limit = 100} = req.query;

        const query = {
            user_id: req.user.id // ← FILTER BY USER
        };

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

        const customers = await Customer.find(query).sort({createdAt: -1}).skip(skip).limit(parseInt(limit));

        const total = await Customer.countDocuments(query);

        console.log(`✅ Fetched ${customers.length} customers for user ${req.user.email}`);

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
        const customer = await Customer.findOne({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY: Only own data
        });

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        // Fetch last payment info from latest paid invoice
        const lastInvoice = await Invoice.findOne({
            customer_id: customer._id,
            user_id: req.user.id,
            status: "paid"
        }).sort({payment_received_date: -1});

        if (lastInvoice) {
            customer.last_payment_date = lastInvoice.payment_received_date;
            customer.last_payment_amount = lastInvoice.total_amount;
        }

        res.json(customer);
    })
);

// CREATE customer
router.post(
    "/",
    asyncHandler(async (req, res) => {
        const {
            name,
            address,
            package: pkg,
            wifi_id,
            subscription_start_date,
            next_due_date,
            phone_whatsapp,
            status,
            notes,
            router_purchase_price,
            registration_fee,
            installation_discount,
            other_fees
        } = req.body;

        console.log("📝 Creating customer:", {name, wifi_id, user: req.user.email});

        // Validasi required fields
        if (!name || !address || !pkg || !wifi_id || !subscription_start_date || !next_due_date || !phone_whatsapp) {
            return res.status(400).json({
                error: "Field wajib: name, address, package, wifi_id, subscription_start_date, next_due_date, phone_whatsapp"
            });
        }

        // Check duplicate wifi_id WITHIN USER's data only
        const existingCustomer = await Customer.findOne({
            wifi_id,
            user_id: req.user.id
        });

        if (existingCustomer) {
            return res.status(409).json({
                error: "WiFi ID sudah terdaftar di akun Anda"
            });
        }

        const newCustomer = new Customer({
            name,
            address,
            package: pkg,
            wifi_id,
            subscription_start_date: new Date(subscription_start_date),
            next_due_date: new Date(next_due_date),
            phone_whatsapp,
            status: status || "active",
            notes: notes || "",
            router_purchase_price: parseFloat(router_purchase_price) || 0,
            registration_fee: parseFloat(registration_fee) || 0,
            installation_discount: parseFloat(installation_discount) || 0,
            other_fees: parseFloat(other_fees) || 0,
            user_id: req.user.id, // ← ASSIGN TO USER
            created_by: req.user.email
        });

        await newCustomer.save();

        console.log(`✅ Customer created: ${newCustomer._id} by ${req.user.email}`);

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
            name,
            address,
            package: pkg,
            wifi_id,
            subscription_start_date,
            next_due_date,
            phone_whatsapp,
            status,
            notes,
            router_purchase_price,
            registration_fee,
            installation_discount,
            other_fees
        } = req.body;

        console.log(`📝 Updating customer: ${req.params.id}`);

        const customer = await Customer.findOne({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        });

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        // Update fields
        if (name) customer.name = name;
        if (address) customer.address = address;
        if (pkg) customer.package = pkg;
        if (wifi_id) customer.wifi_id = wifi_id;
        if (subscription_start_date) customer.subscription_start_date = new Date(subscription_start_date);
        if (next_due_date) customer.next_due_date = new Date(next_due_date);
        if (phone_whatsapp) customer.phone_whatsapp = phone_whatsapp;
        if (status) customer.status = status;
        if (notes !== undefined) customer.notes = notes;

        // Update financial fields
        if (router_purchase_price !== undefined) customer.router_purchase_price = parseFloat(router_purchase_price);
        if (registration_fee !== undefined) customer.registration_fee = parseFloat(registration_fee);
        if (installation_discount !== undefined) customer.installation_discount = parseFloat(installation_discount);
        if (other_fees !== undefined) customer.other_fees = parseFloat(other_fees);

        customer.updated_by = req.user.email;

        await customer.save();

        console.log(`✅ Customer updated: ${customer._id}`);

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
        console.log(`🗑️ Deleting customer: ${req.params.id}`);

        const customer = await Customer.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user.id // ← SECURITY
        });

        if (!customer) {
            return res.status(404).json({error: "Customer tidak ditemukan"});
        }

        console.log(`✅ Customer deleted: ${req.params.id}`);

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
                const fileContent = fs.readFileSync(filePath, "utf-8");
                const parseResult = Papa.parse(fileContent, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: false
                });
                data = parseResult.data;
            } else if (fileExt === "xlsx" || fileExt === "xls") {
                const workbook = XLSX.readFile(filePath);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(worksheet);
            } else {
                return res.status(400).json({error: "Format file tidak didukung (CSV/XLSX saja)"});
            }

            console.log(`📂 Importing ${data.length} rows for user ${req.user.email}...`);

            let imported = 0;

            for (let i = 0; i < data.length; i++) {
                const row = data[i];

                try {
                    const cleanRow = {};
                    Object.keys(row).forEach(key => {
                        cleanRow[key.trim()] = typeof row[key] === "string" ? row[key].trim() : row[key];
                    });

                    if (!cleanRow.name || !cleanRow.wifi_id) {
                        errors.push(`Row ${i + 2}: name, wifi_id wajib diisi`);
                        continue;
                    }

                    // Check duplicate WITHIN USER's data
                    const exists = await Customer.findOne({
                        wifi_id: cleanRow.wifi_id,
                        user_id: req.user.id
                    });

                    if (exists) {
                        errors.push(`Row ${i + 2}: wifi_id sudah ada di akun Anda`);
                        continue;
                    }

                    const newCustomer = new Customer({
                        name: cleanRow.name,
                        address: cleanRow.address || "N/A",
                        package: cleanRow.package || "Standard",
                        wifi_id: cleanRow.wifi_id,
                        subscription_start_date: cleanRow.subscription_start_date
                            ? new Date(cleanRow.subscription_start_date)
                            : new Date(),
                        next_due_date: cleanRow.next_due_date
                            ? new Date(cleanRow.next_due_date)
                            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        phone_whatsapp: cleanRow.phone_whatsapp || "62812345678",
                        status: cleanRow.status || "active",
                        notes: cleanRow.notes || "",
                        router_purchase_price: parseFloat(cleanRow.router_purchase_price) || 0,
                        registration_fee: parseFloat(cleanRow.registration_fee) || 0,
                        installation_discount: parseFloat(cleanRow.installation_discount) || 0,
                        other_fees: parseFloat(cleanRow.other_fees) || 0,
                        user_id: req.user.id, // ← ASSIGN TO USER
                        created_by: req.user.email
                    });

                    await newCustomer.save();
                    imported++;
                } catch (err) {
                    errors.push(`Row ${i + 2}: ${err.message}`);
                }
            }

            console.log(`✅ Imported ${imported}/${data.length} customers for ${req.user.email}`);

            res.json({
                message: `${imported} pelanggan berhasil diimport`,
                imported,
                errors,
                total_rows: data.length
            });
        } catch (error) {
            console.error("❌ Import error:", error);
            res.status(500).json({
                error: "Gagal mengimport file",
                details: error.message
            });
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    })
);

export default router;
