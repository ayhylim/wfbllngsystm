import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Invoice PDF - 100% MATCH dengan template HTML
 */
export const generateInvoicePDF = (invoice, customer) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 40
            });

            const buffers = [];

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on("error", reject);

            // ========== COLORS (sesuai template HTML) ==========
            const colors = {
                primary: "#2563eb",
                primaryDark: "#1e40af",
                textDark: "#1e293b",
                textMuted: "#64748b",
                success: "#16a34a",
                successDark: "#15803d",
                alert: "#dc2626",
                bgLight: "#f8fafc",
                bgBlue: "#eff6ff",
                border: "#e2e8f0"
            };

            // ========== HEADER SECTION ==========
            doc.fontSize(32).font("Helvetica-Bold").fillColor(colors.primaryDark).text("INVOICE", {align: "center"});

            doc.moveDown(0.3);

            // Company Info
            doc.fontSize(12)
                .font("Helvetica-Bold")
                .fillColor(colors.primaryDark)
                .text("WiFi Billing System", {align: "center"});

            doc.fontSize(10)
                .font("Helvetica")
                .fillColor(colors.textMuted)
                .text("WiFi Angkasa | Jl. Example, Bekasi", {align: "center"})
                .text("Tel: 62812345678 | Email: info@wifiangkasa.com", {align: "center"});

            doc.moveDown(1.2);

            // Horizontal Line (border-bottom header)
            doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(colors.primary).lineWidth(4).stroke();

            doc.moveDown(1.5);

            // ========== INFO SECTION (2 COLUMNS) ==========
            const leftCol = 40;
            const rightCol = 310;
            const startY = doc.y;

            // LEFT BOX: Invoice Details
            doc.rect(leftCol, startY, 250, 100).fillAndStroke(colors.bgLight, colors.border);

            doc.fontSize(11)
                .font("Helvetica-Bold")
                .fillColor(colors.primaryDark)
                .text("INVOICE DETAILS", leftCol + 10, startY + 10);

            const leftContentY = startY + 28;

            doc.fontSize(9)
                .font("Helvetica")
                .fillColor(colors.textMuted)
                .text("Invoice Number:", leftCol + 10, leftContentY);

            doc.font("Helvetica-Bold")
                .fillColor(colors.textDark)
                .text(invoice.invoice_number, leftCol + 110, leftContentY, {width: 130});

            doc.font("Helvetica")
                .fillColor(colors.textMuted)
                .text("Payment Receipt:", leftCol + 10, leftContentY + 15);

            doc.font("Helvetica-Bold")
                .fillColor(colors.success)
                .text(invoice.payment_receipt_number, leftCol + 110, leftContentY + 15, {width: 130});

            doc.font("Helvetica")
                .fillColor(colors.textMuted)
                .text("Invoice Date:", leftCol + 10, leftContentY + 30);

            doc.font("Helvetica-Bold")
                .fillColor(colors.textDark)
                .text(
                    new Date(invoice.invoice_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }),
                    leftCol + 110,
                    leftContentY + 30,
                    {width: 130}
                );

            doc.font("Helvetica")
                .fillColor(colors.textMuted)
                .text("Due Date:", leftCol + 10, leftContentY + 45);

            doc.font("Helvetica-Bold")
                .fillColor(colors.alert)
                .text(
                    new Date(invoice.due_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }),
                    leftCol + 110,
                    leftContentY + 45,
                    {width: 130}
                );

            // RIGHT BOX: Customer Details
            doc.rect(rightCol, startY, 245, 100).fillAndStroke(colors.bgLight, colors.border);

            doc.fontSize(11)
                .font("Helvetica-Bold")
                .fillColor(colors.primaryDark)
                .text("BILL TO", rightCol + 10, startY + 10);

            const rightContentY = startY + 28;

            doc.fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(colors.textDark)
                .text(customer.name, rightCol + 10, rightContentY, {width: 225});

            doc.fontSize(9)
                .font("Helvetica")
                .fillColor(colors.textMuted)
                .text(`Customer ID: ${customer.customer_id}`, rightCol + 10, rightContentY + 15)
                .text(`WiFi ID: ${customer.wifi_id}`, rightCol + 10, rightContentY + 28)
                .text(`Phone: ${customer.phone_whatsapp}`, rightCol + 10, rightContentY + 41);

            doc.text(customer.address, rightCol + 10, rightContentY + 54, {
                width: 225,
                lineGap: 2
            });

            doc.moveDown(8);

            // ========== SUBSCRIPTION BOX ==========
            const subBoxY = doc.y;
            doc.rect(40, subBoxY, 515, 45).fillAndStroke(colors.bgBlue, colors.primary);

            doc.fontSize(9)
                .font("Helvetica")
                .fillColor(colors.primaryDark)
                .text("Package:", 50, subBoxY + 10);

            doc.font("Helvetica-Bold")
                .fillColor(colors.textDark)
                .text(customer.package, 110, subBoxY + 10);

            doc.font("Helvetica")
                .fillColor(colors.primaryDark)
                .text("Subscription Start:", 270, subBoxY + 10);

            doc.font("Helvetica-Bold")
                .fillColor(colors.textDark)
                .text(new Date(customer.subscription_start_date).toLocaleDateString("id-ID"), 390, subBoxY + 10);

            doc.font("Helvetica")
                .fillColor(colors.primaryDark)
                .text("Billing Period:", 50, subBoxY + 27);

            doc.font("Helvetica-Bold")
                .fillColor(colors.textDark)
                .text(
                    `${new Date(invoice.period_start).toLocaleDateString("id-ID")} - ${new Date(
                        invoice.period_end
                    ).toLocaleDateString("id-ID")}`,
                    140,
                    subBoxY + 27
                );

            doc.moveDown(3.5);

            // ========== ITEMS TABLE ==========
            const tableTop = doc.y;
            const itemCol = 45;
            const descCol = 150;
            const qtyCol = 385;
            const amountCol = 450;

            // Table Header
            doc.rect(40, tableTop, 515, 25).fillAndStroke(colors.primary, colors.primary);

            doc.fontSize(10)
                .font("Helvetica-Bold")
                .fillColor("#ffffff")
                .text("ITEM", itemCol, tableTop + 8, {width: 100})
                .text("DESCRIPTION", descCol, tableTop + 8, {width: 230})
                .text("QTY", qtyCol, tableTop + 8, {width: 60, align: "center"})
                .text("AMOUNT", amountCol, tableTop + 8, {width: 100, align: "right"});

            let currentY = tableTop + 25;

            // Helper function to add row
            const addTableRow = (item, desc, qty, amount, isDiscount = false) => {
                const rowHeight = 30;

                doc.rect(40, currentY, 515, rowHeight).stroke(colors.border);

                if (currentY % 60 === 0) {
                    doc.rect(40, currentY, 515, rowHeight).fillAndStroke(colors.bgLight, colors.border);
                }

                const textColor = isDiscount ? colors.success : colors.textDark;

                doc.fontSize(9)
                    .font("Helvetica")
                    .fillColor(textColor)
                    .text(item, itemCol, currentY + 10, {width: 100});

                doc.fontSize(9)
                    .fillColor(colors.textMuted)
                    .text(desc, descCol, currentY + 10, {width: 230});

                doc.fillColor(textColor).text(qty, qtyCol, currentY + 10, {width: 60, align: "center"});

                doc.font("Helvetica-Bold")
                    .fillColor(textColor)
                    .text(amount, amountCol, currentY + 10, {width: 100, align: "right"});

                currentY += rowHeight;
            };

            // Monthly Subscription
            addTableRow(
                "Monthly WiFi",
                `${customer.package} - Monthly Subscription`,
                "1",
                `Rp ${invoice.amount.toLocaleString("id-ID")}`
            );

            // Router Cost
            if (invoice.router_cost > 0) {
                addTableRow(
                    "Router Device",
                    "One-time purchase",
                    "1",
                    `Rp ${invoice.router_cost.toLocaleString("id-ID")}`
                );
            }

            // Installation Cost
            if (invoice.installation_cost > 0) {
                addTableRow(
                    "Installation",
                    "Registration & Setup Fee",
                    "1",
                    `Rp ${invoice.installation_cost.toLocaleString("id-ID")}`
                );
            }

            // Other Fees
            if (invoice.other_fees > 0) {
                addTableRow(
                    "Other Fees",
                    "Additional charges",
                    "1",
                    `Rp ${invoice.other_fees.toLocaleString("id-ID")}`
                );
            }

            // Installation Discount
            if (invoice.installation_discount > 0) {
                addTableRow(
                    "Discount",
                    "Installation Discount",
                    "-",
                    `-Rp ${invoice.installation_discount.toLocaleString("id-ID")}`,
                    true
                );
            }

            doc.moveDown(2);

            // ========== TOTALS SECTION ==========
            const totalsY = currentY + 20;

            // Subtotal (if tax exists)
            if (invoice.tax > 0) {
                doc.fontSize(10).font("Helvetica").fillColor(colors.textMuted).text("Subtotal:", 375, totalsY);

                doc.font("Helvetica-Bold")
                    .fillColor(colors.textDark)
                    .text(`Rp ${(invoice.total_amount - invoice.tax).toLocaleString("id-ID")}`, amountCol, totalsY, {
                        width: 100,
                        align: "right"
                    });

                doc.font("Helvetica")
                    .fillColor(colors.textMuted)
                    .text("Tax:", 375, totalsY + 18);

                doc.font("Helvetica-Bold")
                    .fillColor(colors.textDark)
                    .text(`Rp ${invoice.tax.toLocaleString("id-ID")}`, amountCol, totalsY + 18, {
                        width: 100,
                        align: "right"
                    });
            }

            // TOTAL FINAL BOX
            const totalY = invoice.tax > 0 ? totalsY + 45 : totalsY;

            doc.rect(370, totalY - 5, 185, 35).fillAndStroke(colors.bgBlue, colors.primary);

            doc.fontSize(12)
                .font("Helvetica-Bold")
                .fillColor(colors.primaryDark)
                .text("TOTAL:", 380, totalY + 5);

            doc.fontSize(14)
                .fillColor(colors.primaryDark)
                .text(`Rp ${invoice.total_amount.toLocaleString("id-ID")}`, amountCol, totalY + 5, {
                    width: 100,
                    align: "right"
                });

            doc.moveDown(3);

            // ========== PAYMENT INFORMATION ==========
            if (invoice.payment_method || invoice.payment_received_date || invoice.received_by) {
                doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(colors.border).lineWidth(1).stroke();

                doc.moveDown(1);

                doc.rect(40, doc.y, 515, 70).fillAndStroke("#f0fdf4", colors.success);

                const paymentY = doc.y;

                doc.fontSize(11)
                    .font("Helvetica-Bold")
                    .fillColor(colors.successDark)
                    .text("PAYMENT INFORMATION", 50, paymentY + 10);

                doc.moveDown(1.2);

                if (invoice.payment_method) {
                    doc.fontSize(9).font("Helvetica").fillColor(colors.textMuted).text("Payment Method:", 50, doc.y);

                    doc.font("Helvetica-Bold")
                        .fillColor(colors.textDark)
                        .text(invoice.payment_method.toUpperCase(), 160, doc.y - 9);
                }

                if (invoice.payment_received_date) {
                    doc.font("Helvetica")
                        .fillColor(colors.textMuted)
                        .text("Payment Received:", 50, doc.y + 6);

                    doc.font("Helvetica-Bold")
                        .fillColor(colors.success)
                        .text(
                            new Date(invoice.payment_received_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            }),
                            160,
                            doc.y - 3
                        );
                }

                if (invoice.received_by) {
                    doc.font("Helvetica")
                        .fillColor(colors.textMuted)
                        .text("Received By:", 50, doc.y + 6);

                    doc.font("Helvetica-Bold")
                        .fillColor(colors.textDark)
                        .text(invoice.received_by, 160, doc.y - 3);
                }

                doc.moveDown(2.5);
            }

            // ========== NOTES SECTION ==========
            if (invoice.notes) {
                doc.rect(40, doc.y, 515, 60).fillAndStroke("#fffbeb", "#f59e0b");

                const notesY = doc.y;

                doc.fontSize(11)
                    .font("Helvetica-Bold")
                    .fillColor("#b45309")
                    .text("NOTES", 50, notesY + 10);

                doc.moveDown(0.8);

                doc.fontSize(9).font("Helvetica").fillColor("#78350f").text(invoice.notes, 50, doc.y, {
                    width: 495,
                    align: "justify",
                    lineGap: 3
                });

                doc.moveDown(1.5);
            }

            // ========== CUSTOMER INFO ==========
            if (customer.last_payment_date || customer.notes) {
                doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(colors.border).lineWidth(1).stroke();

                doc.moveDown(0.8);

                doc.fontSize(10).font("Helvetica-Bold").fillColor(colors.textDark).text("CUSTOMER INFO");

                doc.moveDown(0.3);

                if (customer.last_payment_date) {
                    doc.fontSize(9)
                        .font("Helvetica")
                        .fillColor(colors.textMuted)
                        .text(
                            `Last Payment: ${new Date(customer.last_payment_date).toLocaleDateString("id-ID")} - Rp ${(
                                customer.last_payment_amount || 0
                            ).toLocaleString("id-ID")}`
                        );
                }

                if (customer.notes) {
                    doc.fontSize(9)
                        .font("Helvetica")
                        .fillColor(colors.textMuted)
                        .text(`Notes: ${customer.notes}`, {width: 515, lineGap: 2});
                }

                doc.moveDown(1);
            }

            // ========== FOOTER ==========
            doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor(colors.border).lineWidth(2).stroke();

            doc.moveDown(1.2);

            doc.fontSize(9)
                .font("Helvetica-Bold")
                .fillColor(colors.primary)
                .text("Thank you for your business!", {width: 515, align: "center"});

            doc.fontSize(8)
                .font("Helvetica")
                .fillColor("#94a3b8")
                .text("Please make payment before the due date to avoid service interruption.", {
                    width: 515,
                    align: "center"
                });

            doc.moveDown(0.5);

            doc.fontSize(7)
                .fillColor("#94a3b8")
                .text(
                    `Generated by WiFi Billing System | ${new Date().toLocaleString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    })}`,
                    40,
                    doc.page.height - 40,
                    {align: "center", width: 515}
                );

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Save PDF to disk
 */
export const savePDFToDisk = async (pdfBuffer, invoiceNumber) => {
    const invoicesDir = path.join(__dirname, "..", "invoices");

    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, {recursive: true});
    }

    const pdfPath = path.join(invoicesDir, `${invoiceNumber}.pdf`);

    fs.writeFileSync(pdfPath, pdfBuffer);

    return pdfPath;
};

export default {generateInvoicePDF, savePDFToDisk};
