import React, {useEffect, useState} from "react";
import axios from "axios";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Label} from "../components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "../components/ui/dialog";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "../components/ui/table";
import {Badge} from "../components/ui/badge";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../components/ui/select";
import {toast} from "sonner";
import {Plus, Download, Send, FileText, Users} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

export const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customer_id: "",
        template_id: "",
        amount: "",
        due_date: "",
        send_whatsapp: false
    });
    const [bulkFormData, setBulkFormData] = useState({
        customer_ids: [],
        template_id: "",
        amount: "",
        due_date: ""
    });

    useEffect(() => {
        fetchInvoices();
        fetchCustomers();
        fetchTemplates();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/invoices`);
            setInvoices(response.data.data || []);
            console.log(`✅ Loaded ${response.data.data.length} invoices`);
        } catch (error) {
            console.error("❌ Fetch invoices failed:", error);
            toast.error("Gagal memuat invoice");
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await axios.get(`${API}/customers`);
            setCustomers((response.data.data || []).filter(c => c.status === "active"));
        } catch (error) {
            console.error("Failed to fetch customers");
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await axios.get(`${API}/templates`);
            setTemplates(response.data || []);
        } catch (error) {
            console.error("Failed to fetch templates");
        }
    };

    const handleGenerate = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${API}/invoices/generate`, formData);
            toast.success(`Invoice ${response.data.data.invoice_number} berhasil dibuat`);
            setDialogOpen(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Gagal generate invoice";
            toast.error(errorMsg);
            console.error("❌ Generate error:", error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = async invoiceId => {
        try {
            await axios.post(`${API}/invoices/send/${invoiceId}`);
            toast.success("Invoice berhasil dikirim via WhatsApp");
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.error || "Gagal mengirim invoice");
        }
    };

    const handleBulkSend = async e => {
        e.preventDefault();
        if (bulkFormData.customer_ids.length === 0) {
            toast.error("Pilih minimal 1 pelanggan");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${API}/invoices/bulk-send`, bulkFormData);
            const success = response.data.results.filter(r => r.success).length;
            toast.success(`${success} invoice berhasil dikirim`);
            setBulkDialogOpen(false);
            resetBulkForm();
            fetchInvoices();
        } catch (error) {
            toast.error("Gagal mengirim bulk invoice");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async invoiceNumber => {
        try {
            const response = await axios.get(`${API}/invoices/download/${invoiceNumber}`, {
                responseType: "blob"
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Invoice berhasil didownload");
        } catch (error) {
            toast.error("Gagal download invoice");
        }
    };

    const resetForm = () => {
        setFormData({
            customer_id: "",
            template_id: "",
            amount: "",
            due_date: "",
            send_whatsapp: false
        });
    };

    const resetBulkForm = () => {
        setBulkFormData({
            customer_ids: [],
            template_id: "",
            amount: "",
            due_date: ""
        });
    };

    const getStatusColor = status => {
        switch (status) {
            case "paid":
                return "bg-green-500";
            case "sent":
                return "bg-blue-500";
            case "overdue":
                return "bg-rose-500";
            default:
                return "bg-slate-500";
        }
    };

    return (
        <div className="space-y-6" data-testid="invoices-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Invoice</h1>
                    <p className="text-slate-600">Generate dan kelola invoice pelanggan</p>
                </div>
                <div className="flex gap-3">
                    <Dialog
                        open={bulkDialogOpen}
                        onOpenChange={open => {
                            setBulkDialogOpen(open);
                            if (!open) resetBulkForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2" data-testid="bulk-send-button">
                                <Users size={16} />
                                Kirim Bulk
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl" data-testid="bulk-send-dialog">
                            <DialogHeader>
                                <DialogTitle>Kirim Invoice Massal</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleBulkSend} className="space-y-4">
                                <div>
                                    <Label>Pilih Pelanggan *</Label>
                                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                        {customers.map(customer => (
                                            <div key={customer._id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id={`bulk-${customer._id}`}
                                                    checked={bulkFormData.customer_ids.includes(customer._id)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setBulkFormData({
                                                                ...bulkFormData,
                                                                customer_ids: [
                                                                    ...bulkFormData.customer_ids,
                                                                    customer._id
                                                                ]
                                                            });
                                                        } else {
                                                            setBulkFormData({
                                                                ...bulkFormData,
                                                                customer_ids: bulkFormData.customer_ids.filter(
                                                                    id => id !== customer._id
                                                                )
                                                            });
                                                        }
                                                    }}
                                                    data-testid={`bulk-checkbox-${customer._id}`}
                                                />
                                                <label htmlFor={`bulk-${customer._id}`} className="text-sm">
                                                    {customer.name} ({customer.customer_id})
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label>Jumlah Tagihan (Rp) *</Label>
                                    <Input
                                        type="number"
                                        required
                                        value={bulkFormData.amount}
                                        onChange={e => setBulkFormData({...bulkFormData, amount: e.target.value})}
                                        data-testid="bulk-input-amount"
                                    />
                                </div>
                                <div>
                                    <Label>Tanggal Jatuh Tempo *</Label>
                                    <Input
                                        type="date"
                                        required
                                        value={bulkFormData.due_date}
                                        onChange={e => setBulkFormData({...bulkFormData, due_date: e.target.value})}
                                        data-testid="bulk-input-due-date"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                    data-testid="bulk-submit-button"
                                >
                                    {loading ? "Mengirim..." : "Generate & Kirim via WhatsApp"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

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
                                data-testid="generate-invoice-button"
                            >
                                <Plus size={16} />
                                Generate Invoice
                            </Button>
                        </DialogTrigger>
                        <DialogContent data-testid="invoice-form-dialog">
                            <DialogHeader>
                                <DialogTitle>Generate Invoice Baru</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleGenerate} className="space-y-4">
                                <div>
                                    <Label>Pilih Pelanggan *</Label>
                                    <Select
                                        value={formData.customer_id}
                                        onValueChange={value => setFormData({...formData, customer_id: value})}
                                    >
                                        <SelectTrigger data-testid="select-customer">
                                            <SelectValue placeholder="Pilih pelanggan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers.map(customer => (
                                                <SelectItem key={customer._id} value={customer._id}>
                                                    {customer.name} - {customer.customer_id}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Template (Optional)</Label>
                                    <Select
                                        value={formData.template_id}
                                        onValueChange={value => setFormData({...formData, template_id: value})}
                                    >
                                        <SelectTrigger data-testid="select-template">
                                            <SelectValue placeholder="Default template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map(template => (
                                                <SelectItem key={template._id} value={template._id}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Jumlah Tagihan (Rp) *</Label>
                                    <Input
                                        type="number"
                                        required
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                        data-testid="input-amount"
                                    />
                                </div>
                                <div>
                                    <Label>Tanggal Jatuh Tempo *</Label>
                                    <Input
                                        type="date"
                                        required
                                        value={formData.due_date}
                                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                                        data-testid="input-due-date"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="send_whatsapp"
                                        checked={formData.send_whatsapp}
                                        onChange={e => setFormData({...formData, send_whatsapp: e.target.checked})}
                                        data-testid="checkbox-send-wa"
                                    />
                                    <Label htmlFor="send_whatsapp">Kirim via WhatsApp setelah generate</Label>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                    data-testid="submit-invoice-button"
                                >
                                    {loading ? "Generating..." : "Generate Invoice"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Invoices Table */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText />
                        Daftar Invoice ({invoices.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nomor Invoice</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Jumlah</TableHead>
                                        <TableHead>Jatuh Tempo</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Dibuat</TableHead>
                                        <TableHead>Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map(invoice => (
                                        <TableRow key={invoice._id} data-testid={`invoice-row-${invoice._id}`}>
                                            <TableCell className="font-mono text-sm font-semibold">
                                                {invoice.invoice_number}
                                            </TableCell>
                                            <TableCell>{invoice.customer_name}</TableCell>
                                            <TableCell className="font-semibold">
                                                Rp {invoice.total_amount.toLocaleString("id-ID")}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(invoice.due_date).toLocaleDateString("id-ID")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(invoice.status)}>
                                                    {invoice.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {new Date(invoice.createdAt).toLocaleDateString("id-ID")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {invoice.pdf_url && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDownload(invoice.invoice_number)}
                                                            data-testid={`download-${invoice._id}`}
                                                        >
                                                            <Download size={14} />
                                                        </Button>
                                                    )}
                                                    {invoice.status !== "sent" && invoice.status !== "paid" && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleSendWhatsApp(invoice._id)}
                                                            data-testid={`send-wa-${invoice._id}`}
                                                        >
                                                            <Send size={14} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {invoices.length === 0 && !loading && (
                                <div className="text-center py-8 text-slate-500">
                                    Belum ada invoice. Generate invoice baru untuk memulai.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Invoices;
