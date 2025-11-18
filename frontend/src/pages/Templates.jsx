import React, {useEffect, useState} from "react";
import axios from "axios";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Label} from "../components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "../components/ui/dialog";
import {Badge} from "../components/ui/badge";
import {toast} from "sonner";
import {Plus, Eye, Trash2, Star, ExternalLink} from "lucide-react";
import {Textarea} from "../components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

const defaultTemplateHTML = `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
                padding: 40px;
                background: white;
                color: #1e293b;
                line-height: 1.6;
            }
            .header {
                text-align: center;
                border-bottom: 4px solid #2563eb;
                padding-bottom: 25px;
                margin-bottom: 30px;
            }
            .company {
                font-size: 26px;
                font-weight: bold;
                color: #1e40af;
                margin-bottom: 5px;
            }
            .company-details {
                font-size: 11px;
                color: #64748b;
                margin-top: 8px;
            }
            .invoice-title {
                font-size: 36px;
                color: #2563eb;
                margin-top: 12px;
                font-weight: 800;
                letter-spacing: 2px;
            }
            .info-section {
                display: flex;
                justify-content: space-between;
                margin-top: 30px;
                margin-bottom: 30px;
            }
            .info-box {
                flex: 1;
                padding: 20px;
                background: #f8fafc;
                border-radius: 8px;
                margin: 0 10px;
            }
            .info-box:first-child {
                margin-left: 0;
            }
            .info-box:last-child {
                margin-right: 0;
            }
            .info-box h3 {
                font-size: 13px;
                color: #1e40af;
                font-weight: bold;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .info-row {
                display: flex;
                margin: 8px 0;
                font-size: 11px;
            }
            .label {
                font-weight: 600;
                color: #64748b;
                min-width: 130px;
            }
            .value {
                color: #1e293b;
                font-weight: 500;
            }
            .value.highlight {
                color: #16a34a;
                font-weight: 700;
            }
            .value.alert {
                color: #dc2626;
                font-weight: 700;
            }
            .subscription-box {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 2px solid #2563eb;
                border-radius: 10px;
                padding: 18px 25px;
                margin: 25px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .subscription-box .item {
                text-align: center;
            }
            .subscription-box .item .label {
                font-size: 10px;
                color: #1e40af;
                font-weight: 600;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            .subscription-box .item .value {
                font-size: 13px;
                color: #1e293b;
                font-weight: bold;
            }
            .table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 25px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                border-radius: 8px;
                overflow: hidden;
            }
            .table th {
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                color: white;
                padding: 14px 16px;
                text-align: left;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .table td {
                border: 1px solid #e2e8f0;
                padding: 14px 16px;
                font-size: 11px;
            }
            .table tbody tr:nth-child(even) {
                background: #f8fafc;
            }
            .table tbody tr:hover {
                background: #eff6ff;
            }
            .table .item-name {
                font-weight: 700;
                color: #1e293b;
            }
            .table .item-desc {
                color: #64748b;
                font-size: 10px;
            }
            .table .amount {
                text-align: right;
                font-weight: 700;
                color: #1e293b;
            }
            .table .discount-row {
                color: #16a34a;
            }
            .totals-section {
                margin-top: 25px;
                text-align: right;
            }
            .totals-row {
                display: flex;
                justify-content: flex-end;
                margin: 8px 0;
                font-size: 12px;
            }
            .totals-row .label {
                min-width: 120px;
                text-align: right;
                padding-right: 20px;
                color: #64748b;
            }
            .totals-row .amount {
                min-width: 150px;
                text-align: right;
                font-weight: 700;
                color: #1e293b;
            }
            .total-final {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 2px solid #2563eb;
                border-radius: 8px;
                padding: 15px 20px;
                margin-top: 15px;
                font-size: 16px;
            }
            .total-final .label {
                color: #1e40af;
                font-weight: 800;
                font-size: 15px;
            }
            .total-final .amount {
                color: #1e40af;
                font-weight: 800;
                font-size: 18px;
            }
            .payment-info {
                background: #f0fdf4;
                border: 2px solid #16a34a;
                border-radius: 8px;
                padding: 18px 25px;
                margin-top: 30px;
            }
            .payment-info h3 {
                font-size: 13px;
                color: #15803d;
                font-weight: bold;
                margin-bottom: 12px;
                text-transform: uppercase;
            }
            .notes-section {
                background: #fffbeb;
                border: 2px solid #f59e0b;
                border-radius: 8px;
                padding: 18px 25px;
                margin-top: 20px;
            }
            .notes-section h3 {
                font-size: 13px;
                color: #b45309;
                font-weight: bold;
                margin-bottom: 10px;
                text-transform: uppercase;
            }
            .notes-section p {
                font-size: 11px;
                color: #78350f;
                line-height: 1.8;
            }
            .customer-info-section {
                background: #fef2f2;
                border: 2px solid #dc2626;
                border-radius: 8px;
                padding: 18px 25px;
                margin-top: 20px;
            }
            .customer-info-section h3 {
                font-size: 13px;
                color: #991b1b;
                font-weight: bold;
                margin-bottom: 12px;
                text-transform: uppercase;
            }
            .footer {
                margin-top: 50px;
                text-align: center;
                padding-top: 25px;
                border-top: 2px solid #e2e8f0;
            }
            .footer .thank-you {
                font-size: 14px;
                color: #2563eb;
                font-weight: bold;
                margin-bottom: 8px;
            }
            .footer .note {
                font-size: 10px;
                color: #64748b;
                margin-bottom: 20px;
            }
            .footer .generated {
                font-size: 9px;
                color: #94a3b8;
            }
        </style>
    </head>
    <body>
        <!-- HEADER -->
        <div class="header">
            <div class="company">WiFi Billing System</div>
            <div class="company-details">
                WiFi Angkasa | Jl. Example, Bekasi
                <br />
                Tel: 62812345678 | Email: info@wifiangkasa.com
            </div>
            <div class="invoice-title">INVOICE</div>
        </div>

        <!-- INFO SECTION -->
        <div class="info-section">
            <!-- Invoice Details -->
            <div class="info-box">
                <h3>Invoice Details</h3>
                <div class="info-row">
                    <span class="label">Invoice Number:</span>
                    <span class="value">{{invoice_number}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Payment Receipt:</span>
                    <span class="value highlight">{{payment_receipt_number}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Invoice Date:</span>
                    <span class="value">{{invoice_date}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Due Date:</span>
                    <span class="value alert">{{due_date}}</span>
                </div>
            </div>

            <!-- Customer Details -->
            <div class="info-box">
                <h3>Bill To</h3>
                <div class="info-row">
                    <span class="label">Customer Name:</span>
                    <span class="value">{{customer_name}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Customer ID:</span>
                    <span class="value">{{customer_id}}</span>
                </div>
                <div class="info-row">
                    <span class="label">WiFi ID:</span>
                    <span class="value">{{wifi_id}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Phone:</span>
                    <span class="value">{{phone_whatsapp}}</span>
                </div>
                <div class="info-row">
                    <span class="label">Address:</span>
                    <span class="value">{{address}}</span>
                </div>
            </div>
        </div>

        <!-- SUBSCRIPTION INFO -->
        <div class="subscription-box">
            <div class="item">
                <div class="label">Package</div>
                <div class="value">{{package}}</div>
            </div>
            <div class="item">
                <div class="label">Subscription Start</div>
                <div class="value">{{subscription_start_date}}</div>
            </div>
            <div class="item">
                <div class="label">Billing Period</div>
                <div class="value">{{period_start}} - {{period_end}}</div>
            </div>
        </div>

        <!-- ITEMS TABLE -->
        <table class="table">
            <thead>
                <tr>
                    <th style="width: 25%">ITEM</th>
                    <th style="width: 45%">DESCRIPTION</th>
                    <th style="width: 10%; text-align: center">QTY</th>
                    <th style="width: 20%; text-align: right">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                <!-- Monthly Subscription -->
                <tr>
                    <td class="item-name">Monthly WiFi</td>
                    <td class="item-desc">{{package}} - Monthly Subscription</td>
                    <td style="text-align: center">1</td>
                    <td class="amount">{{monthly_amount}}</td>
                </tr>

                <!-- Router Cost (if exists) -->
                {{#if router_cost}}
                <tr>
                    <td class="item-name">Router Device</td>
                    <td class="item-desc">One-time purchase</td>
                    <td style="text-align: center">1</td>
                    <td class="amount">{{router_cost}}</td>
                </tr>
                {{/if}}

                <!-- Installation Cost (if exists) -->
                {{#if installation_cost}}
                <tr>
                    <td class="item-name">Installation</td>
                    <td class="item-desc">Registration & Setup Fee</td>
                    <td style="text-align: center">1</td>
                    <td class="amount">{{installation_cost}}</td>
                </tr>
                {{/if}}

                <!-- Other Fees (if exists) -->
                {{#if other_fees}}
                <tr>
                    <td class="item-name">Other Fees</td>
                    <td class="item-desc">Additional charges</td>
                    <td style="text-align: center">1</td>
                    <td class="amount">{{other_fees}}</td>
                </tr>
                {{/if}}

                <!-- Installation Discount (if exists) -->
                {{#if installation_discount}}
                <tr class="discount-row">
                    <td class="item-name">Discount</td>
                    <td class="item-desc">Installation Discount</td>
                    <td style="text-align: center">-</td>
                    <td class="amount">-{{installation_discount}}</td>
                </tr>
                {{/if}}
            </tbody>
        </table>

        <!-- TOTALS -->
        <div class="totals-section">
            {{#if tax}}
            <div class="totals-row">
                <div class="label">Subtotal:</div>
                <div class="amount">{{subtotal}}</div>
            </div>
            <div class="totals-row">
                <div class="label">Tax:</div>
                <div class="amount">{{tax}}</div>
            </div>
            {{/if}}

            <div class="totals-row total-final">
                <div class="label">TOTAL:</div>
                <div class="amount">{{total_amount}}</div>
            </div>
        </div>

        <!-- PAYMENT INFO (if exists) -->
        {{#if payment_method}}
        <div class="payment-info">
            <h3>Payment Information</h3>
            <div class="info-row">
                <span class="label">Payment Method:</span>
                <span class="value">{{payment_method}}</span>
            </div>
            {{#if payment_received_date}}
            <div class="info-row">
                <span class="label">Payment Received:</span>
                <span class="value highlight">{{payment_received_date}}</span>
            </div>
            {{/if}} {{#if received_by}}
            <div class="info-row">
                <span class="label">Received By:</span>
                <span class="value">{{received_by}}</span>
            </div>
            {{/if}}
        </div>
        {{/if}}

        <!-- NOTES (if exists) -->
        {{#if notes}}
        <div class="notes-section">
            <h3>Notes</h3>
            <p>{{notes}}</p>
        </div>
        {{/if}}

        <!-- CUSTOMER INFO (if exists) -->
        {{#if last_payment_date}}
        <div class="customer-info-section">
            <h3>Customer Information</h3>
            <div class="info-row">
                <span class="label">Last Payment:</span>
                <span class="value">{{last_payment_date}} - {{last_payment_amount}}</span>
            </div>
            {{#if customer_notes}}
            <div class="info-row">
                <span class="label">Customer Notes:</span>
                <span class="value">{{customer_notes}}</span>
            </div>
            {{/if}}
        </div>
        {{/if}}

        <!-- FOOTER -->
        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div class="note">Please make payment before the due date to avoid service interruption.</div>
            <div class="generated">Generated by WiFi Billing System | {{generated_date}}</div>
        </div>
    </body>
</html>
`;

export const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState("");
    const [previewInNewTab, setPreviewInNewTab] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        html_content: defaultTemplateHTML,
        is_default: false
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/templates`);
            setTemplates(response.data || []);
            console.log(`✅ Loaded ${response.data.length} templates`);
        } catch (error) {
            console.error("❌ Fetch templates failed:", error);
            toast.error("Gagal memuat template");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            setLoading(true);
            await axios.post(`${API}/templates`, formData);
            toast.success("Template berhasil ditambahkan");
            setDialogOpen(false);
            resetForm();
            fetchTemplates();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Gagal menyimpan template";
            toast.error(errorMsg);
            console.error("❌ Submit error:", error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async id => {
        if (!window.confirm("Yakin ingin menghapus template ini?")) return;
        try {
            await axios.delete(`${API}/templates/${id}`);
            toast.success("Template berhasil dihapus");
            fetchTemplates();
        } catch (error) {
            toast.error("Gagal menghapus template");
        }
    };

    // IMPROVED PREVIEW: Replace placeholders with mock data
    const generatePreviewHTML = content => {
        return content
            .replace(/\{\{name\}\}/g, "John Doe")
            .replace(/\{\{customer_id\}\}/g, "CUST-001")
            .replace(/\{\{address\}\}/g, "Jl. Contoh No. 123, Jakarta Selatan")
            .replace(/\{\{package\}\}/g, "Premium 100Mbps")
            .replace(/\{\{wifi_id\}\}/g, "WIFI-12345")
            .replace(/\{\{amount\}\}/g, "Rp 500,000")
            .replace(/\{\{due_date\}\}/g, "31 Desember 2025")
            .replace(/\{\{invoice_number\}\}/g, "INV-20251114-SAMPLE")
            .replace(
                /\{\{date\}\}/g,
                new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })
            );
    };

    // Preview in Dialog
    const handlePreview = content => {
        const previewHTML = generatePreviewHTML(content);
        setPreviewContent(previewHTML);
        setPreviewOpen(true);
    };

    // Preview in New Tab (RECOMMENDED - Full HTML rendering)
    const handlePreviewInNewTab = content => {
        const previewHTML = generatePreviewHTML(content);

        // Open in new tab/window
        const previewWindow = window.open("", "_blank");

        if (previewWindow) {
            previewWindow.document.write(previewHTML);
            previewWindow.document.close();

            toast.success("Preview dibuka di tab baru");
        } else {
            toast.error("Popup blocked! Izinkan popup untuk preview");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            html_content: defaultTemplateHTML,
            is_default: false
        });
    };

    return (
        <div className="space-y-6" data-testid="templates-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Template Invoice</h1>
                    <p className="text-slate-600">Kelola template untuk invoice PDF</p>
                </div>
                <Dialog
                    open={dialogOpen}
                    onOpenChange={open => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                            className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                            data-testid="add-template-button"
                        >
                            <Plus size={16} />
                            Tambah Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent
                        className="max-w-4xl max-h-[90vh] overflow-y-auto"
                        data-testid="template-form-dialog"
                    >
                        <DialogHeader>
                            <DialogTitle>Tambah Template Baru</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Nama Template *</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Contoh: Template Professional"
                                    data-testid="input-template-name"
                                />
                            </div>
                            <div>
                                <Label>HTML Content *</Label>
                                <p className="text-xs text-slate-500 mb-2">
                                    Gunakan placeholder: <code className="bg-slate-100 px-1 rounded">{"{{name}}"}</code>
                                    , <code className="bg-slate-100 px-1 rounded">{"{{customer_id}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{address}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{package}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{wifi_id}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{amount}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{due_date}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{invoice_number}}"}</code>,{" "}
                                    <code className="bg-slate-100 px-1 rounded">{"{{date}}"}</code>
                                </p>
                                <Textarea
                                    required
                                    value={formData.html_content}
                                    onChange={e => setFormData({...formData, html_content: e.target.value})}
                                    rows={15}
                                    className="font-mono text-sm"
                                    data-testid="input-template-html"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_default"
                                    checked={formData.is_default}
                                    onChange={e => setFormData({...formData, is_default: e.target.checked})}
                                    data-testid="checkbox-is-default"
                                />
                                <Label htmlFor="is_default">Jadikan template default</Label>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handlePreviewInNewTab(formData.html_content)}
                                    data-testid="preview-new-tab-button"
                                    className="gap-2"
                                >
                                    <ExternalLink size={16} />
                                    Preview (New Tab)
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handlePreview(formData.html_content)}
                                    data-testid="preview-button"
                                    className="gap-2"
                                >
                                    <Eye size={16} />
                                    Preview (Dialog)
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={loading}
                                    data-testid="submit-template-button"
                                >
                                    {loading ? "Menyimpan..." : "Simpan Template"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <Card
                            key={template._id}
                            className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200 hover:shadow-xl transition-shadow"
                            data-testid={`template-card-${template._id}`}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="text-lg">{template.name}</span>
                                    {template.is_default && (
                                        <Badge className="bg-amber-500">
                                            <Star size={12} className="mr-1" />
                                            Default
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="bg-slate-100 rounded-lg p-3 h-32 overflow-hidden">
                                        <p className="text-xs text-slate-600 font-mono line-clamp-6">
                                            {template.body?.substring(0, 200)}...
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePreviewInNewTab(template.body)}
                                            data-testid={`preview-new-tab-${template._id}`}
                                            className="flex-1 gap-1"
                                        >
                                            <ExternalLink size={14} />
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePreview(template.body)}
                                            data-testid={`preview-dialog-${template._id}`}
                                            className="gap-1"
                                        >
                                            <Eye size={14} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-rose-600 hover:text-rose-700"
                                            onClick={() => handleDelete(template._id)}
                                            data-testid={`delete-${template._id}`}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {templates.length === 0 && !loading && (
                <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200">
                    <CardContent className="py-12">
                        <div className="text-center text-slate-500">
                            <p>Belum ada template. Klik tombol "Tambah Template" untuk membuat template baru.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview Dialog - WITH IMPROVED RENDERING */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden" data-testid="preview-dialog">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Preview Template</span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    handlePreviewInNewTab(
                                        previewContent
                                            .replace(/John Doe/g, "{{name}}")
                                            .replace(/CUST-001/g, "{{customer_id}}")
                                            .replace(/Jl\. Contoh No\. 123, Jakarta Selatan/g, "{{address}}")
                                            .replace(/Premium 100Mbps/g, "{{package}}")
                                            .replace(/WIFI-12345/g, "{{wifi_id}}")
                                            .replace(/Rp 500,000/g, "{{amount}}")
                                            .replace(/31 Desember 2025/g, "{{due_date}}")
                                            .replace(/INV-20251114-SAMPLE/g, "{{invoice_number}}")
                                    );
                                }}
                                className="gap-2"
                            >
                                <ExternalLink size={14} />
                                Open in New Tab
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    {/* IMPROVED: Use iframe for better HTML rendering */}
                    <div className="border rounded-lg overflow-hidden bg-white" style={{height: "70vh"}}>
                        <iframe
                            srcDoc={previewContent}
                            title="Template Preview"
                            className="w-full h-full"
                            style={{
                                border: "none",
                                backgroundColor: "white"
                            }}
                            sandbox="allow-same-origin"
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                        <strong>💡 Tips:</strong> Untuk preview yang lebih akurat, gunakan tombol "Preview (New Tab)"
                        atau "Open in New Tab" di atas. Preview ini menggunakan data mock untuk placeholder.
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Templates;
