import React, {useEffect, useState} from "react";
import axios from "axios";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Label} from "../components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "../components/ui/dialog";
import {Badge} from "../components/ui/badge";
import {toast} from "sonner";
import {Plus, Eye, Trash2, Star} from "lucide-react";
import {Textarea} from "../components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

const defaultTemplateHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .company { font-size: 24px; font-weight: bold; color: #1e40af; }
        .invoice-title { font-size: 32px; color: #2563eb; margin-top: 10px; }
        .info-section { margin-top: 30px; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .table th { background-color: #2563eb; color: white; }
        .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class='header'>
        <div class='company'>WiFi Billing System</div>
        <div class='invoice-title'>INVOICE</div>
    </div>
    <div class='info-section'>
        <div class='info-row'>
            <div><span class='label'>Nomor Invoice:</span> {{invoice_number}}</div>
            <div><span class='label'>Tanggal:</span> {{date}}</div>
        </div>
        <div class='info-row'>
            <div><span class='label'>Jatuh Tempo:</span> {{due_date}}</div>
        </div>
    </div>
    <div class='info-section'>
        <h3>Pelanggan:</h3>
        <div><span class='label'>Nama:</span> {{name}}</div>
        <div><span class='label'>ID Pelanggan:</span> {{customer_id}}</div>
        <div><span class='label'>Alamat:</span> {{address}}</div>
        <div><span class='label'>WiFi ID:</span> {{wifi_id}}</div>
    </div>
    <table class='table'>
        <thead>
            <tr>
                <th>Deskripsi</th>
                <th>Paket</th>
                <th>Jumlah</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Tagihan WiFi Bulanan</td>
                <td>{{package}}</td>
                <td>{{amount}}</td>
            </tr>
        </tbody>
    </table>
    <div class='total'>
        Total: {{amount}}
    </div>
    <div class='footer'>
        <p>Terima kasih atas kepercayaan Anda!</p>
        <p>Untuk pertanyaan, hubungi customer service kami.</p>
    </div>
</body>
</html>`;

export const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState("");
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

    const handlePreview = content => {
        // Replace placeholders with sample data
        let preview = content
            .replace(/{{name}}/g, "John Doe")
            .replace(/{{customer_id}}/g, "CUST-001")
            .replace(/{{address}}/g, "Jl. Contoh No. 123, Jakarta")
            .replace(/{{package}}/g, "Premium 100Mbps")
            .replace(/{{wifi_id}}/g, "WIFI-12345")
            .replace(/{{amount}}/g, "Rp 500,000")
            .replace(/{{due_date}}/g, "31/12/2025")
            .replace(/{{invoice_number}}/g, "INV-20250101-ABC123")
            .replace(/{{date}}/g, new Date().toLocaleDateString("id-ID"));

        setPreviewContent(preview);
        setPreviewOpen(true);
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
                                    Gunakan placeholder: name, customer_id, address, package, wifi_id, amount, due_date,
                                    invoice_number, date (format: {"{{"}placeholder{"}}"}})
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
                                    onClick={() => handlePreview(formData.html_content)}
                                    data-testid="preview-button"
                                >
                                    <Eye size={16} className="mr-2" />
                                    Preview
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
                                            className="flex-1"
                                            onClick={() => handlePreview(template.body)}
                                            data-testid={`preview-${template._id}`}
                                        >
                                            <Eye size={14} className="mr-1" />
                                            Preview
                                        </Button>
                                        <Button
                                            variant="outline"
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

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="preview-dialog">
                    <DialogHeader>
                        <DialogTitle>Preview Template</DialogTitle>
                    </DialogHeader>
                    <div
                        className="border rounded-lg p-4 bg-white"
                        dangerouslySetInnerHTML={{__html: previewContent}}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Templates;
