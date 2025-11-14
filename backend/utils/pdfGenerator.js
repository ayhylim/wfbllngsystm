import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Invoice PDF
 * @param {Object} invoice - Invoice data from MongoDB
 * @param {Object} customer - Customer data from MongoDB
 * @returns {Promise<Buffer>} - PDF Buffer
 */
export const generateInvoicePDF = (invoice, customer) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 50
            });

            const buffers = [];

            // Collect PDF chunks
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on("error", reject);

            // Company Header
            doc.fontSize(28).font("Helvetica-Bold").fillColor("#2563eb").text("INVOICE", {align: "center"});

            doc.moveDown(0.5);

            // Company Info
            doc.fontSize(11)
                .font("Helvetica")
                .fillColor("#1e40af")
                .text(process.env.INVOICE_COMPANY_NAME || "WiFi Angkasa", {align: "center"})
                .fontSize(10)
                .fillColor("#64748b")
                .text(process.env.INVOICE_COMPANY_ADDRESS || "Jl. Example, Bekasi", {align: "center"})
                .text(process.env.INVOICE_COMPANY_PHONE || "62812345678", {align: "center"})
                .text(process.env.INVOICE_COMPANY_EMAIL || "info@wifiangkasa.com", {align: "center"});

            doc.moveDown(1.5);

            // Horizontal line
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").lineWidth(2).stroke();

            doc.moveDown(1);

            // Invoice Details Section
            const leftCol = 50;
            const rightCol = 320;
            const startY = doc.y;

            // Left Column - Invoice Details
            doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("INVOICE DETAILS", leftCol, startY);

            doc.moveDown(0.3);

            doc.fontSize(10)
                .font("Helvetica")
                .fillColor("#475569")
                .text(`Invoice No: ${invoice.invoice_number}`, leftCol)
                .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString("id-ID")}`)
                .text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString("id-ID")}`);

            // Right Column - Customer Details
            doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("BILL TO", rightCol, startY);

            doc.moveDown(0.3);

            doc.fontSize(10)
                .font("Helvetica")
                .fillColor("#475569")
                .text(`Name: ${customer.name}`, rightCol)
                .text(`ID: ${customer.customer_id}`)
                .text(`Phone: ${customer.phone_whatsapp}`)
                .text(`Address: ${customer.address}`, rightCol, doc.y, {
                    width: 200,
                    lineGap: 2
                });

            doc.moveDown(2);

            // Items Table
            const tableTop = doc.y;
            const itemCol = 50;
            const descCol = 150;
            const amountCol = 450;

            // Table Header
            doc.fontSize(11)
                .font("Helvetica-Bold")
                .fillColor("#ffffff")
                .rect(50, tableTop, 500, 25)
                .fillAndStroke("#2563eb", "#2563eb");

            doc.fillColor("#ffffff")
                .text("Item", itemCol + 10, tableTop + 8)
                .text("Description", descCol, tableTop + 8)
                .text("Amount", amountCol, tableTop + 8, {width: 90, align: "right"});

            // Table Row
            const rowY = tableTop + 25;

            doc.fontSize(10)
                .font("Helvetica")
                .fillColor("#1e293b")
                .text("WiFi Package", itemCol + 10, rowY + 10)
                .text(`${customer.package} - Monthly`, descCol, rowY + 10)
                .text(`Rp ${invoice.amount.toLocaleString("id-ID")}`, amountCol, rowY + 10, {
                    width: 90,
                    align: "right"
                });

            // Row border
            doc.rect(50, rowY, 500, 35).stroke("#e2e8f0");

            doc.moveDown(3);

            // Totals Section
            const totalsY = rowY + 50;

            if (invoice.tax > 0) {
                doc.fontSize(10)
                    .font("Helvetica")
                    .fillColor("#475569")
                    .text("Subtotal:", amountCol - 80, totalsY)
                    .text(`Rp ${invoice.amount.toLocaleString("id-ID")}`, amountCol, totalsY, {
                        width: 90,
                        align: "right"
                    });

                doc.text("Tax:", amountCol - 80, totalsY + 20).text(
                    `Rp ${invoice.tax.toLocaleString("id-ID")}`,
                    amountCol,
                    totalsY + 20,
                    {
                        width: 90,
                        align: "right"
                    }
                );
            }

            // Total
            const totalY = invoice.tax > 0 ? totalsY + 50 : totalsY;

            doc.fontSize(12)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text("TOTAL:", amountCol - 80, totalY)
                .fontSize(14)
                .fillColor("#2563eb")
                .text(`Rp ${invoice.total_amount.toLocaleString("id-ID")}`, amountCol, totalY, {
                    width: 90,
                    align: "right"
                });

            // Horizontal line before footer
            doc.moveDown(2);
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();

            doc.moveDown(1);

            // Notes Section
            if (invoice.notes) {
                doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("Notes:");

                doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(invoice.notes, {
                    width: 500,
                    lineGap: 2
                });

                doc.moveDown(1);
            }

            // Payment Info
            doc.fontSize(9)
                .font("Helvetica")
                .fillColor("#64748b")
                .text("Thank you for your business! Please make payment before the due date.", {
                    width: 500,
                    align: "center"
                });

            // Footer
            doc.fontSize(8)
                .fillColor("#94a3b8")
                .text(
                    `Generated by WiFi Billing System | ${new Date().toLocaleString("id-ID")}`,
                    50,
                    doc.page.height - 50,
                    {
                        align: "center",
                        width: 500
                    }
                );

            // Finalize PDF
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Save PDF to disk
 * @param {Buffer} pdfBuffer - PDF Buffer
 * @param {String} invoiceNumber - Invoice Number
 * @returns {Promise<String>} - File path
 */
export const savePDFToDisk = async (pdfBuffer, invoiceNumber) => {
    const invoicesDir = path.join(__dirname, "..", "invoices");

    // Create directory if not exists
    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, {recursive: true});
    }

    const pdfPath = path.join(invoicesDir, `${invoiceNumber}.pdf`);

    // Write buffer to file
    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfPath;
};
