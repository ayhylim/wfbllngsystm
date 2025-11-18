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
import {Plus, Download, Send, FileText, Users, Loader2, Search, Filter, X, Edit, Trash2} from "lucide-react";
import {Checkbox} from "../components/ui/checkbox";
import {SearchableSelect} from "../components/ui/searchable-select";
import {CurrencyInput, formatRupiah} from "../components/ui/currency-input";
import {Textarea} from "../components/ui/textarea";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

export const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);

    // Search & Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Generate Invoice Form
    const [formData, setFormData] = useState({
        customer_id: "",
        template_id: "",
        amount: "",
        due_date: "",
        send_whatsapp: false,
        payment_method: "",
        payment_received_date: "",
        received_by: "",
        notes: "",
        include_router_cost: false,
        include_installation_cost: false
    });

    // Edit Invoice Form
    const [editFormData, setEditFormData] = useState({
        customer_id: "",
        amount: "",
        router_cost: "",
        installation_cost: "",
        other_fees: "",
        installation_discount: "",
        tax: "",
        status: "",
        due_date: "",
        payment_received_date: "",
        payment_method: "",
        received_by: "",
        notes: ""
    });

    // Bulk Send Form - IMPROVED: Use array of customer IDs
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
    }, [searchQuery, filterStatus, filterPaymentMethod, filterDateFrom, filterDateTo]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            if (searchQuery) params.append("q", searchQuery);
            if (filterStatus) params.append("status", filterStatus);
            if (filterPaymentMethod) params.append("payment_method", filterPaymentMethod);
            if (filterDateFrom) params.append("date_from", filterDateFrom);
            if (filterDateTo) params.append("date_to", filterDateTo);

            const response = await axios.get(`${API}/invoices?${params.toString()}`);
            setInvoices(response.data.data || []);
            console.log(`✅ Loaded ${response.data.data.length} invoices`);
        } catch (error) {
            console.error("❌ Fetch invoices failed:", error);
            toast.error(error.response?.data?.error || "Gagal memuat invoice");
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

    const clearFilters = () => {
        setSearchQuery("");
        setFilterStatus("");
        setFilterPaymentMethod("");
        setFilterDateFrom("");
        setFilterDateTo("");
    };

    const handleGenerate = async e => {
        e.preventDefault();
        setGenerating(true);

        const toastId = toast.loading("Generating invoice & PDF...");

        try {
            const response = await axios.post(`${API}/invoices/generate`, formData, {
                timeout: 60000
            });

            toast.success(`Invoice ${response.data.data.invoice_number} berhasil dibuat!`, {
                id: toastId
            });

            setDialogOpen(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || "Gagal generate invoice";
            toast.error(errorMsg, {id: toastId});
            console.error("❌ Generate error:", error.response?.data || error.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleEdit = invoice => {
        setEditingInvoice(invoice);
        setEditFormData({
            customer_id: invoice.customer_id?._id || invoice.customer_id || "", // ✅ FIXED
            amount: invoice.amount || "", // ✅ FIXED: Add fallback
            router_cost: invoice.router_cost || "", // ✅ FIXED
            installation_cost: invoice.installation_cost || "", // ✅ FIXED
            other_fees: invoice.other_fees || "", // ✅ FIXED
            installation_discount: invoice.installation_discount || "", // ✅ FIXED
            tax: invoice.tax || "", // ✅ FIXED
            status: invoice.status || "draft", // ✅ FIXED: Default to "draft" if undefined
            due_date: invoice.due_date?.split("T")[0] || "", // ✅ Already good
            payment_received_date: invoice.payment_received_date?.split("T")[0] || "", // ✅ Already good
            payment_method: invoice.payment_method || "", // ✅ Already good
            received_by: invoice.received_by || "", // ✅ Already good
            notes: invoice.notes || "" // ✅ Already good
        });
        setEditDialogOpen(true);
    };

    const handleEditSubmit = async e => {
        e.preventDefault();
        setGenerating(true);
        const toastId = toast.loading("Updating invoice...");

        try {
            await axios.put(`${API}/invoices/${editingInvoice._id}`, editFormData);
            toast.success("Invoice berhasil diupdate!", {id: toastId});
            setEditDialogOpen(false);
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.error || "Gagal update invoice", {id: toastId});
        } finally {
            setGenerating(false);
        }
    };

    const handleDelete = async invoiceId => {
        if (!window.confirm("Yakin ingin menghapus invoice ini? PDF akan terhapus juga.")) return;

        const toastId = toast.loading("Menghapus invoice...");

        try {
            await axios.delete(`${API}/invoices/${invoiceId}`);
            toast.success("Invoice berhasil dihapus!", {id: toastId});
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.error || "Gagal menghapus invoice", {id: toastId});
        }
    };

    const handleSendWhatsApp = async invoiceId => {
        const toastId = toast.loading("Mengirim invoice via WhatsApp...");

        try {
            await axios.post(
                `${API}/invoices/send/${invoiceId}`,
                {},
                {
                    timeout: 30000
                }
            );
            toast.success("Invoice berhasil dikirim via WhatsApp!", {id: toastId});
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.error || "Gagal mengirim invoice", {id: toastId});
        }
    };

    const handleBulkSend = async e => {
        e.preventDefault();
        if (bulkFormData.customer_ids.length === 0) {
            toast.error("Pilih minimal 1 pelanggan");
            return;
        }

        setGenerating(true);
        const toastId = toast.loading(`Mengirim ke ${bulkFormData.customer_ids.length} pelanggan...`);

        try {
            const response = await axios.post(`${API}/invoices/bulk-send`, bulkFormData, {
                timeout: 120000
            });
            const success = response.data.results.filter(r => r.success).length;
            toast.success(`${success} invoice berhasil dikirim!`, {id: toastId});
            setBulkDialogOpen(false);
            resetBulkForm();
            fetchInvoices();
        } catch (error) {
            toast.error(error.response?.data?.error || "Gagal mengirim bulk invoice", {id: toastId});
        } finally {
            setGenerating(false);
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
            send_whatsapp: false,
            payment_method: "",
            payment_received_date: "",
            received_by: "",
            notes: "",
            include_router_cost: false,
            include_installation_cost: false
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

    // BULK: Add customer to selection
    const handleAddCustomerToBulk = customerId => {
        if (!customerId) return;
        if (bulkFormData.customer_ids.includes(customerId)) {
            toast.warning("Pelanggan sudah dipilih");
            return;
        }
        setBulkFormData({
            ...bulkFormData,
            customer_ids: [...bulkFormData.customer_ids, customerId]
        });
    };

    // BULK: Remove customer from selection
    const handleRemoveCustomerFromBulk = customerId => {
        setBulkFormData({
            ...bulkFormData,
            customer_ids: bulkFormData.customer_ids.filter(id => id !== customerId)
        });
    };

    return (
        <div className="space-y-6" data-testid="invoices-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Invoice</h1>
                    <p className="text-slate-600">Generate dan kelola invoice pelanggan</p>
                </div>
                <div className="flex gap-3">
                    {/* ========== BULK SEND DIALOG - IMPROVED ========== */}
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
                                    <div className="space-y-3">
                                        {/* Dropdown untuk menambah pelanggan */}
                                        <SearchableSelect
                                            value=""
                                            onValueChange={handleAddCustomerToBulk}
                                            options={customers
                                                .filter(c => !bulkFormData.customer_ids.includes(c._id))
                                                .map(c => ({
                                                    value: c._id,
                                                    label: `${c.name} - ${c.customer_id}`
                                                }))}
                                            placeholder="Cari & tambah pelanggan..."
                                            searchPlaceholder="Cari nama atau ID..."
                                        />

                                        {/* List pelanggan terpilih */}
                                        {bulkFormData.customer_ids.length > 0 && (
                                            <div className="border rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto">
                                                <p className="text-xs font-semibold text-slate-700 mb-2">
                                                    Pelanggan Terpilih ({bulkFormData.customer_ids.length}):
                                                </p>
                                                <div className="space-y-2">
                                                    {bulkFormData.customer_ids.map(customerId => {
                                                        const customer = customers.find(c => c._id === customerId);
                                                        if (!customer) return null;
                                                        return (
                                                            <div
                                                                key={customerId}
                                                                className="flex items-center justify-between bg-white rounded p-2 border"
                                                            >
                                                                <span className="text-sm">
                                                                    {customer.name} ({customer.customer_id})
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        handleRemoveCustomerFromBulk(customerId)
                                                                    }
                                                                    className="text-rose-600 hover:text-rose-700"
                                                                >
                                                                    <X size={14} />
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {bulkFormData.customer_ids.length === 0 && (
                                            <p className="text-sm text-slate-500 italic">
                                                Belum ada pelanggan dipilih. Gunakan dropdown di atas untuk menambah.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label>Jumlah Tagihan (Rp) *</Label>
                                    <CurrencyInput
                                        required
                                        value={bulkFormData.amount}
                                        onChange={value => setBulkFormData({...bulkFormData, amount: value})}
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
                                    disabled={generating || bulkFormData.customer_ids.length === 0}
                                    data-testid="bulk-submit-button"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating & Sending...
                                        </>
                                    ) : (
                                        `Generate & Kirim ke ${bulkFormData.customer_ids.length} Pelanggan`
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* ========== GENERATE INVOICE DIALOG ========== */}
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
                        <DialogContent
                            className="max-w-2xl max-h-[90vh] overflow-y-auto"
                            data-testid="invoice-form-dialog"
                        >
                            <DialogHeader>
                                <DialogTitle>Generate Invoice Baru</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleGenerate} className="space-y-4">
                                <div>
                                    <Label>Pilih Pelanggan *</Label>
                                    <SearchableSelect
                                        value={formData.customer_id}
                                        onValueChange={value => setFormData({...formData, customer_id: value})}
                                        options={customers.map(c => ({
                                            value: c._id,
                                            label: `${c.name} - ${c.customer_id}`
                                        }))}
                                        placeholder="Pilih pelanggan..."
                                        searchPlaceholder="Cari nama pelanggan..."
                                    />
                                </div>

                                <div>
                                    <Label>Jumlah Tagihan Bulanan (Rp) *</Label>
                                    <CurrencyInput
                                        required
                                        value={formData.amount}
                                        onChange={value => setFormData({...formData, amount: value})}
                                        data-testid="input-amount"
                                    />
                                </div>

                                <div>
                                    <Label>Tanggal Jatuh Tempo</Label>
                                    <Input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                                        placeholder="Kosongkan untuk ambil dari data pelanggan"
                                        data-testid="input-due-date"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Kosongkan untuk otomatis menggunakan tanggal jatuh tempo dari data pelanggan
                                    </p>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-semibold text-slate-800 mb-3">Biaya Tambahan (Opsional)</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="include_router"
                                                checked={formData.include_router_cost}
                                                onCheckedChange={checked =>
                                                    setFormData({...formData, include_router_cost: checked})
                                                }
                                            />
                                            <label htmlFor="include_router" className="text-sm cursor-pointer">
                                                Sertakan biaya router dalam invoice ini
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="include_installation"
                                                checked={formData.include_installation_cost}
                                                onCheckedChange={checked =>
                                                    setFormData({...formData, include_installation_cost: checked})
                                                }
                                            />
                                            <label htmlFor="include_installation" className="text-sm cursor-pointer">
                                                Sertakan biaya instalasi & registrasi dalam invoice ini
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-semibold text-slate-800 mb-3">Detail Pembayaran (Opsional)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Metode Pembayaran</Label>
                                            <Select
                                                value={formData.payment_method}
                                                onValueChange={value =>
                                                    setFormData({...formData, payment_method: value})
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih metode" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cash">Cash</SelectItem>
                                                    <SelectItem value="transfer">Transfer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Tanggal Pembayaran Diterima</Label>
                                            <Input
                                                type="date"
                                                value={formData.payment_received_date}
                                                onChange={e =>
                                                    setFormData({...formData, payment_received_date: e.target.value})
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label>Diterima Oleh</Label>
                                            <Input
                                                value={formData.received_by}
                                                onChange={e => setFormData({...formData, received_by: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label>Catatan (Footer PDF)</Label>
                                    <Input
                                        value={formData.notes}
                                        onChange={e => setFormData({...formData, notes: e.target.value})}
                                        placeholder="Catatan tambahan untuk invoice"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="send_whatsapp"
                                        checked={formData.send_whatsapp}
                                        onCheckedChange={checked => setFormData({...formData, send_whatsapp: checked})}
                                    />
                                    <Label htmlFor="send_whatsapp">Kirim via WhatsApp setelah generate</Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={generating}
                                    data-testid="submit-invoice-button"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        "Generate Invoice"
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ========== SEARCH & FILTERS ========== */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200">
                <CardContent className="pt-6 space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                                size={20}
                            />
                            <Input
                                placeholder="Cari invoice (no. invoice, no. bukti, nama pelanggan)..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                data-testid="search-input"
                            />
                        </div>
                        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                            <Filter size={16} />
                            {showFilters ? "Hide" : "Show"} Filters
                        </Button>
                        {(searchQuery || filterStatus || filterPaymentMethod || filterDateFrom || filterDateTo) && (
                            <Button variant="outline" onClick={clearFilters} className="gap-2">
                                <X size={16} />
                                Clear
                            </Button>
                        )}
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                            <div>
                                <Label>Status</Label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Semua status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Semua</SelectItem>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Metode Pembayaran</Label>
                                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Semua metode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Semua</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="transfer">Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Dari Tanggal</Label>
                                <Input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={e => setFilterDateFrom(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Sampai Tanggal</Label>
                                <Input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={e => setFilterDateTo(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ========== INVOICES TABLE ========== */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText />
                        Daftar Invoice ({invoices.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-4" />
                            <p className="text-slate-600">Loading invoices...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>No. Invoice</TableHead>
                                        <TableHead>No. Bukti</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Jumlah</TableHead>
                                        <TableHead>Metode</TableHead>
                                        <TableHead>Jatuh Tempo</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map(invoice => (
                                        <TableRow key={invoice._id} data-testid={`invoice-row-${invoice._id}`}>
                                            <TableCell className="font-mono text-xs font-semibold">
                                                {invoice.invoice_number}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600">
                                                {invoice.payment_receipt_number}
                                            </TableCell>
                                            <TableCell>{invoice.customer_name}</TableCell>
                                            <TableCell className="font-semibold">
                                                {formatRupiah(invoice.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                                {invoice.payment_method ? (
                                                    <Badge variant="outline">{invoice.payment_method}</Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(invoice.due_date).toLocaleDateString("id-ID")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(invoice.status)}>
                                                    {invoice.status}
                                                </Badge>
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
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(invoice)}
                                                        data-testid={`edit-${invoice._id}`}
                                                    >
                                                        <Edit size={14} />
                                                    </Button>
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
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-rose-600 hover:text-rose-700"
                                                        onClick={() => handleDelete(invoice._id)}
                                                        data-testid={`delete-${invoice._id}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {invoices.length === 0 && !loading && (
                                <div className="text-center py-8 text-slate-500">
                                    {searchQuery ||
                                    filterStatus ||
                                    filterPaymentMethod ||
                                    filterDateFrom ||
                                    filterDateTo
                                        ? "Tidak ada invoice yang sesuai dengan filter"
                                        : "Belum ada invoice. Generate invoice baru untuk memulai."}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ========== EDIT INVOICE DIALOG - FIXED ========== */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Invoice {editingInvoice?.invoice_number}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                            <p className="text-sm text-sky-800">
                                <strong>No. Bukti:</strong> {editingInvoice?.payment_receipt_number}
                            </p>
                            <p className="text-sm text-sky-800">
                                <strong>Dibuat:</strong>{" "}
                                {editingInvoice?.createdAt &&
                                    new Date(editingInvoice.createdAt).toLocaleString("id-ID")}
                            </p>
                        </div>

                        <div>
                            <Label>Pelanggan *</Label>
                            <SearchableSelect
                                value={editFormData.customer_id}
                                onValueChange={value => setEditFormData({...editFormData, customer_id: value})}
                                options={customers.map(c => ({
                                    value: c._id,
                                    label: `${c.name} - ${c.customer_id}`
                                }))}
                                placeholder="Pilih pelanggan..."
                                searchPlaceholder="Cari nama pelanggan..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tagihan Bulanan (Rp) *</Label>
                                <CurrencyInput
                                    required
                                    value={editFormData.amount}
                                    onChange={value => setEditFormData({...editFormData, amount: value})}
                                />
                            </div>
                            <div>
                                <Label>Biaya Router (Rp)</Label>
                                <CurrencyInput
                                    value={editFormData.router_cost}
                                    onChange={value => setEditFormData({...editFormData, router_cost: value})}
                                />
                            </div>
                            <div>
                                <Label>Biaya Instalasi (Rp)</Label>
                                <CurrencyInput
                                    value={editFormData.installation_cost}
                                    onChange={value => setEditFormData({...editFormData, installation_cost: value})}
                                />
                            </div>
                            <div>
                                <Label>Biaya Lain-lain (Rp)</Label>
                                <CurrencyInput
                                    value={editFormData.other_fees}
                                    onChange={value => setEditFormData({...editFormData, other_fees: value})}
                                />
                            </div>
                            <div>
                                <Label>Diskon Instalasi (Rp)</Label>
                                <CurrencyInput
                                    value={editFormData.installation_discount}
                                    onChange={value => setEditFormData({...editFormData, installation_discount: value})}
                                />
                            </div>
                            <div>
                                <Label>Pajak (Rp)</Label>
                                <CurrencyInput
                                    value={editFormData.tax}
                                    onChange={value => setEditFormData({...editFormData, tax: value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Status *</Label>
                                <Select
                                    value={editFormData.status}
                                    onValueChange={value => setEditFormData({...editFormData, status: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="sent">Sent</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="overdue">Overdue</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Tanggal Jatuh Tempo *</Label>
                                <Input
                                    type="date"
                                    required
                                    value={editFormData.due_date}
                                    onChange={e => setEditFormData({...editFormData, due_date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-slate-800 mb-3">Detail Pembayaran</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Metode Pembayaran</Label>
                                    <Select
                                        value={editFormData.payment_method}
                                        onValueChange={value =>
                                            setEditFormData({...editFormData, payment_method: value})
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih metode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Tidak ada</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="transfer">Transfer</SelectItem>
                                            <SelectItem value="check">Check</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Tanggal Pembayaran Diterima</Label>
                                    <Input
                                        type="date"
                                        value={editFormData.payment_received_date}
                                        onChange={e =>
                                            setEditFormData({...editFormData, payment_received_date: e.target.value})
                                        }
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Diterima Oleh</Label>
                                    <Input
                                        value={editFormData.received_by}
                                        onChange={e => setEditFormData({...editFormData, received_by: e.target.value})}
                                        placeholder="Nama penerima pembayaran"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label>Catatan</Label>
                            <Textarea
                                value={editFormData.notes}
                                onChange={e => setEditFormData({...editFormData, notes: e.target.value})}
                                placeholder="Catatan tambahan untuk invoice"
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditDialogOpen(false)}
                                className="flex-1"
                            >
                                Batal
                            </Button>
                            <Button type="submit" className="flex-1" disabled={generating}>
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Invoice"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Invoices;
