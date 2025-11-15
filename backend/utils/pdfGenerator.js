import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate Invoice PDF with ALL CUSTOMER & INVOICE DATA
 * Clean UI, Easy to Read, Professional Layout
 */
export const generateInvoicePDF = (invoice, customer) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: "A4",
                margin: 50
            });

            const buffers = [];

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on("error", reject);

            // ========== HEADER SECTION ==========
            doc.fontSize(32).font("Helvetica-Bold").fillColor("#1e40af").text("INVOICE", {align: "center"});

            doc.moveDown(0.3);

            // Company Info
            doc.fontSize(12)
                .font("Helvetica-Bold")
                .fillColor("#1e40af")
                .text(process.env.INVOICE_COMPANY_NAME || "WiFi Angkasa", {align: "center"});

            doc.fontSize(10)
                .font("Helvetica")
                .fillColor("#64748b")
                .text(process.env.INVOICE_COMPANY_ADDRESS || "Jl. Example, Bekasi", {align: "center"})
                .text(`Tel: ${process.env.INVOICE_COMPANY_PHONE || "62812345678"}`, {align: "center"})
                .text(`Email: ${process.env.INVOICE_COMPANY_EMAIL || "info@wifiangkasa.com"}`, {align: "center"});

            doc.moveDown(1.5);

            // Horizontal Line
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#2563eb").lineWidth(3).stroke();

            doc.moveDown(1.2);

            // ========== INVOICE & CUSTOMER INFO (2 COLUMNS) ==========
            const leftCol = 50;
            const rightCol = 320;
            const startY = doc.y;

            // LEFT: Invoice Details
            doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("INVOICE DETAILS", leftCol, startY);

            doc.moveDown(0.4);

            const invoiceDetailsY = doc.y;

            doc.fontSize(9)
                .font("Helvetica")
                .fillColor("#475569")
                .text("Invoice Number:", leftCol, invoiceDetailsY)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text(invoice.invoice_number, leftCol + 100, invoiceDetailsY);

            doc.font("Helvetica")
                .fillColor("#475569")
                .text("Payment Receipt:", leftCol, invoiceDetailsY + 15)
                .font("Helvetica-Bold")
                .fillColor("#16a34a")
                .text(invoice.payment_receipt_number, leftCol + 100, invoiceDetailsY + 15);

            doc.font("Helvetica")
                .fillColor("#475569")
                .text("Invoice Date:", leftCol, invoiceDetailsY + 30)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text(
                    new Date(invoice.invoice_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }),
                    leftCol + 100,
                    invoiceDetailsY + 30
                );

            doc.font("Helvetica")
                .fillColor("#475569")
                .text("Due Date:", leftCol, invoiceDetailsY + 45)
                .font("Helvetica-Bold")
                .fillColor("#dc2626")
                .text(
                    new Date(invoice.due_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    }),
                    leftCol + 100,
                    invoiceDetailsY + 45
                );

            // RIGHT: Customer Details
            doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("BILL TO", rightCol, startY);

            doc.moveDown(0.4);

            const customerDetailsY = doc.y;

            doc.fontSize(10)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text(customer.name, rightCol, customerDetailsY);

            doc.fontSize(9)
                .font("Helvetica")
                .fillColor("#475569")
                .text(`Customer ID: ${customer.customer_id}`, rightCol, customerDetailsY + 15)
                .text(`WiFi ID: ${customer.wifi_id}`, rightCol, customerDetailsY + 28)
                .text(`Phone: ${customer.phone_whatsapp}`, rightCol, customerDetailsY + 41)
                .text(customer.address, rightCol, customerDetailsY + 54, {
                    width: 230,
                    lineGap: 2
                });

            doc.moveDown(5);

            // ========== SUBSCRIPTION INFO BOX ==========
            const subBoxY = doc.y;
            doc.rect(50, subBoxY, 500, 45).fillAndStroke("#f0f9ff", "#2563eb");

            doc.fontSize(9)
                .font("Helvetica")
                .fillColor("#1e40af")
                .text("Package:", 60, subBoxY + 10)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text(customer.package, 120, subBoxY + 10);

            doc.font("Helvetica")
                .fillColor("#1e40af")
                .text("Subscription Start:", 280, subBoxY + 10)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text(new Date(customer.subscription_start_date).toLocaleDateString("id-ID"), 400, subBoxY + 10);

            doc.font("Helvetica")
                .fillColor("#1e40af")
                .text("Billing Period:", 60, subBoxY + 27)
                .font("Helvetica-Bold")
                .fillColor("#1e293b")
                .text(
                    `${new Date(invoice.period_start).toLocaleDateString("id-ID")} - ${new Date(
                        invoice.period_end
                    ).toLocaleDateString("id-ID")}`,
                    140,
                    subBoxY + 27
                );

            doc.moveDown(3);

            // ========== INVOICE ITEMS TABLE ==========
            const tableTop = doc.y;
            const itemCol = 55;
            const descCol = 220;
            const qtyCol = 420;
            const amountCol = 480;

            // Table Header
            doc.fontSize(10)
                .font("Helvetica-Bold")
                .fillColor("#ffffff")
                .rect(50, tableTop, 500, 25)
                .fillAndStroke("#2563eb", "#2563eb");

            doc.text("ITEM", itemCol, tableTop + 8)
                .text("DESCRIPTION", descCol, tableTop + 8)
                .text("QTY", qtyCol, tableTop + 8)
                .text("AMOUNT", amountCol, tableTop + 8, {width: 60, align: "right"});

            let currentY = tableTop + 25;

            // Monthly Subscription
            doc.fontSize(9)
                .font("Helvetica")
                .fillColor("#1e293b")
                .text("Monthly WiFi", itemCol, currentY + 10)
                .text(`${customer.package}`, descCol, currentY + 10, {width: 195})
                .text("1", qtyCol, currentY + 10)
                .font("Helvetica-Bold")
                .text(`Rp ${invoice.amount.toLocaleString("id-ID")}`, amountCol, currentY + 10, {
                    width: 60,
                    align: "right"
                });

            doc.rect(50, currentY, 500, 30).stroke("#e2e8f0");
            currentY += 30;

            // Router Cost (if exists)
            if (invoice.router_cost > 0) {
                doc.fontSize(9)
                    .font("Helvetica")
                    .fillColor("#1e293b")
                    .text("Router Device", itemCol, currentY + 10)
                    .text("One-time purchase", descCol, currentY + 10)
                    .text("1", qtyCol, currentY + 10)
                    .font("Helvetica-Bold")
                    .text(`Rp ${invoice.router_cost.toLocaleString("id-ID")}`, amountCol, currentY + 10, {
                        width: 60,
                        align: "right"
                    });

                doc.rect(50, currentY, 500, 30).stroke("#e2e8f0");
                currentY += 30;
            }

            // Installation Cost (if exists)
            if (invoice.installation_cost > 0) {
                doc.fontSize(9)
                    .font("Helvetica")
                    .fillColor("#1e293b")
                    .text("Installation", itemCol, currentY + 10)
                    .text("Registration & Setup Fee", descCol, currentY + 10)
                    .text("1", qtyCol, currentY + 10)
                    .font("Helvetica-Bold")
                    .text(`Rp ${invoice.installation_cost.toLocaleString("id-ID")}`, amountCol, currentY + 10, {
                        width: 60,
                        align: "right"
                    });

                doc.rect(50, currentY, 500, 30).stroke("#e2e8f0");
                currentY += 30;
            }

            // Other Fees (if exists)
            if (invoice.other_fees > 0) {
                doc.fontSize(9)
                    .font("Helvetica")
                    .fillColor("#1e293b")
                    .text("Other Fees", itemCol, currentY + 10)
                    .text("Additional charges", descCol, currentY + 10)
                    .text("1", qtyCol, currentY + 10)
                    .font("Helvetica-Bold")
                    .text(`Rp ${invoice.other_fees.toLocaleString("id-ID")}`, amountCol, currentY + 10, {
                        width: 60,
                        align: "right"
                    });

                doc.rect(50, currentY, 500, 30).stroke("#e2e8f0");
                currentY += 30;
            }

            // Installation Discount (if exists)
            if (invoice.installation_discount > 0) {
                doc.fontSize(9)
                    .font("Helvetica")
                    .fillColor("#16a34a")
                    .text("Discount", itemCol, currentY + 10)
                    .text("Installation Discount", descCol, currentY + 10)
                    .text("-", qtyCol, currentY + 10)
                    .font("Helvetica-Bold")
                    .text(`-Rp ${invoice.installation_discount.toLocaleString("id-ID")}`, amountCol, currentY + 10, {
                        width: 60,
                        align: "right"
                    });

                doc.rect(50, currentY, 500, 30).stroke("#e2e8f0");
                currentY += 30;
            }

            doc.moveDown(2);

            // ========== TOTALS SECTION ==========
            const totalsY = currentY + 20;

            // Subtotal (if tax exists)
            if (invoice.tax > 0) {
                doc.fontSize(10)
                    .font("Helvetica")
                    .fillColor("#64748b")
                    .text("Subtotal:", 390, totalsY)
                    .font("Helvetica-Bold")
                    .fillColor("#1e293b")
                    .text(`Rp ${(invoice.total_amount - invoice.tax).toLocaleString("id-ID")}`, amountCol, totalsY, {
                        width: 60,
                        align: "right"
                    });

                doc.font("Helvetica")
                    .fillColor("#64748b")
                    .text("Tax:", 390, totalsY + 18)
                    .font("Helvetica-Bold")
                    .fillColor("#1e293b")
                    .text(`Rp ${invoice.tax.toLocaleString("id-ID")}`, amountCol, totalsY + 18, {
                        width: 60,
                        align: "right"
                    });
            }

            // TOTAL
            const totalY = invoice.tax > 0 ? totalsY + 45 : totalsY;

            doc.rect(380, totalY - 5, 165, 35).fillAndStroke("#eff6ff", "#2563eb");

            doc.fontSize(12)
                .font("Helvetica-Bold")
                .fillColor("#1e40af")
                .text("TOTAL:", 390, totalY + 5)
                .fontSize(14)
                .fillColor("#1e40af")
                .text(`Rp ${invoice.total_amount.toLocaleString("id-ID")}`, amountCol, totalY + 5, {
                    width: 60,
                    align: "right"
                });

            doc.moveDown(3);

            // ========== PAYMENT INFORMATION ==========
            doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();

            doc.moveDown(1);

            if (invoice.payment_method || invoice.payment_received_date || invoice.received_by) {
                doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e293b").text("PAYMENT INFORMATION");

                doc.moveDown(0.3);

                const paymentY = doc.y;

                if (invoice.payment_method) {
                    doc.fontSize(9)
                        .font("Helvetica")
                        .fillColor("#64748b")
                        .text("Payment Method:", 50, paymentY)
                        .font("Helvetica-Bold")
                        .fillColor("#1e293b")
                        .text(invoice.payment_method.toUpperCase(), 150, paymentY);
                }

                if (invoice.payment_received_date) {
                    doc.font("Helvetica")
                        .fillColor("#64748b")
                        .text("Payment Received:", 50, paymentY + 15)
                        .font("Helvetica-Bold")
                        .fillColor("#16a34a")
                        .text(
                            new Date(invoice.payment_received_date).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            }),
                            150,
                            paymentY + 15
                        );
                }

                if (invoice.received_by) {
                    doc.font("Helvetica")
                        .fillColor("#64748b")
                        .text("Received By:", 50, paymentY + 30)
                        .font("Helvetica-Bold")
                        .fillColor("#1e293b")
                        .text(invoice.received_by, 150, paymentY + 30);
                }

                doc.moveDown(2.5);
            }

            // ========== NOTES SECTION ==========
            if (invoice.notes) {
                doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("NOTES:");

                doc.moveDown(0.3);

                doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(invoice.notes, {
                    width: 500,
                    align: "justify",
                    lineGap: 3
                });

                doc.moveDown(1);
            }

            // ========== CUSTOMER INFO SUMMARY ==========
            if (customer.last_payment_date || customer.notes) {
                doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();

                doc.moveDown(0.8);

                doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e293b").text("CUSTOMER INFO");

                doc.moveDown(0.3);

                if (customer.last_payment_date) {
                    doc.fontSize(9)
                        .font("Helvetica")
                        .fillColor("#64748b")
                        .text(
                            `Last Payment: ${new Date(customer.last_payment_date).toLocaleDateString("id-ID")} - Rp ${(
                                customer.last_payment_amount || 0
                            ).toLocaleString("id-ID")}`
                        );
                }

                if (customer.notes) {
                    doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Notes: ${customer.notes}`, {
                        width: 500,
                        lineGap: 2
                    });
                }

                doc.moveDown(1);
            }

            // ========== FOOTER ==========
            doc.fontSize(9).font("Helvetica-Bold").fillColor("#2563eb").text("Thank you for your business!", {
                width: 500,
                align: "center"
            });

            doc.fontSize(8)
                .font("Helvetica")
                .fillColor("#94a3b8")
                .text("Please make payment before the due date to avoid service interruption.", {
                    width: 500,
                    align: "center"
                });

            // Generate Date Footer
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
                    50,
                    doc.page.height - 40,
                    {
                        align: "center",
                        width: 500
                    }
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
