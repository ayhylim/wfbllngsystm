// GUNAKAN FILE INI UNTUK REPLACE frontend/src/pages/Customers.jsx
// PERUBAHAN UTAMA:
// 1. Import PhoneInput untuk WhatsApp number
// 2. Import CurrencyInput untuk financial fields
// 3. Update form dengan component baru

import React, {useEffect, useState} from "react";
import axios from "axios";
import {Card, CardContent, CardHeader, CardTitle} from "../components/ui/card";
import {Button} from "../components/ui/button";
import {Input} from "../components/ui/input";
import {Label} from "../components/ui/label";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "../components/ui/dialog";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "../components/ui/table";
import {Badge} from "../components/ui/badge";
import {toast} from "sonner";
import {Plus, Search, Upload, Edit, Trash2} from "lucide-react";
import {Textarea} from "../components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "../components/ui/select";
import {CurrencyInput, formatRupiah} from "../components/ui/currency-input";
import {PhoneInput, formatPhoneDisplay} from "../components/ui/phone-input";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
const API = `${BACKEND_URL}/api`;

export const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        package: "",
        subscription_start_date: "",
        next_due_date: "",
        phone_whatsapp: "",
        wifi_id: "",
        status: "active",
        notes: "",
        router_purchase_price: "",
        registration_fee: "",
        installation_discount: "",
        other_fees: ""
    });

    useEffect(() => {
        fetchCustomers();
    }, [searchQuery]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API}/customers?q=${searchQuery}`);
            setCustomers(response.data.data || []);
            console.log(`✅ Loaded ${response.data.data.length} customers`);
        } catch (error) {
            console.error("❌ Fetch Customers Failed:", error);
            toast.error("Gagal memuat data pelanggan");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            setLoading(true);
            if (editingCustomer) {
                await axios.put(`${API}/customers/${editingCustomer._id}`, formData);
                toast.success("Pelanggan berhasil diupdate");
            } else {
                await axios.post(`${API}/customers`, formData);
                toast.success("Pelanggan berhasil ditambahkan");
            }
            setDialogOpen(false);
            resetForm();
            fetchCustomers();
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.message || "Gagal menyimpan data";
            toast.error(errorMsg);
            console.error("❌ Submit error:", error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async id => {
        if (!window.confirm("Yakin ingin menghapus pelanggan ini?")) return;
        try {
            await axios.delete(`${API}/customers/${id}`);
            toast.success("Pelanggan berhasil dihapus");
            fetchCustomers();
        } catch (error) {
            toast.error("Gagal menghapus pelanggan");
        }
    };

    const handleEdit = customer => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            address: customer.address,
            package: customer.package,
            subscription_start_date: customer.subscription_start_date?.split("T")[0] || "",
            next_due_date: customer.next_due_date?.split("T")[0] || "",
            phone_whatsapp: customer.phone_whatsapp,
            wifi_id: customer.wifi_id,
            status: customer.status,
            notes: customer.notes || "",
            router_purchase_price: customer.router_purchase_price || "",
            registration_fee: customer.registration_fee || "",
            installation_discount: customer.installation_discount || "",
            other_fees: customer.other_fees || ""
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setEditingCustomer(null);
        setFormData({
            name: "",
            address: "",
            package: "",
            subscription_start_date: "",
            next_due_date: "",
            phone_whatsapp: "",
            wifi_id: "",
            status: "active",
            notes: "",
            router_purchase_price: "",
            registration_fee: "",
            installation_discount: "",
            other_fees: ""
        });
    };

    const handleImport = async e => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setLoading(true);
            const response = await axios.post(`${API}/customers/import`, formData, {
                headers: {"Content-Type": "multipart/form-data"}
            });
            toast.success(`${response.data.imported} pelanggan berhasil diimport`);
            if (response.data.errors.length > 0) {
                console.log("Import errors:", response.data.errors);
                toast.warning(`${response.data.errors.length} baris gagal diimport`);
            }
            setImportDialogOpen(false);
            fetchCustomers();
        } catch (error) {
            toast.error(error.response?.data?.error || "Gagal import data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6" data-testid="customers-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Pelanggan</h1>
                    <p className="text-slate-600">Kelola data pelanggan WiFi</p>
                </div>
                <div className="flex gap-3">
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2" data-testid="import-button">
                                <Upload size={16} />
                                Import CSV/Excel
                            </Button>
                        </DialogTrigger>
                        <DialogContent data-testid="import-dialog">
                            <DialogHeader>
                                <DialogTitle>Import Pelanggan</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600">
                                    Upload file CSV atau Excel dengan kolom: name, address, package, wifi_id,
                                    subscription_start_date, next_due_date, phone_whatsapp, router_purchase_price,
                                    registration_fee
                                </p>
                                <Input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleImport}
                                    disabled={loading}
                                    data-testid="file-input"
                                />
                            </div>
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
                                data-testid="add-customer-button"
                            >
                                <Plus size={16} />
                                Tambah Pelanggan
                            </Button>
                        </DialogTrigger>
                        <DialogContent
                            className="max-w-3xl max-h-[90vh] overflow-y-auto"
                            data-testid="customer-form-dialog"
                        >
                            <DialogHeader>
                                <DialogTitle>
                                    {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {editingCustomer && (
                                    <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                                        <p className="text-sm text-sky-800">
                                            <strong>ID Pelanggan:</strong> {editingCustomer.customer_id}
                                        </p>
                                        {editingCustomer.last_payment_date && (
                                            <p className="text-sm text-sky-800 mt-1">
                                                <strong>Pembayaran Terakhir:</strong>{" "}
                                                {new Date(editingCustomer.last_payment_date).toLocaleDateString(
                                                    "id-ID"
                                                )}{" "}
                                                - {formatRupiah(editingCustomer.last_payment_amount)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <Label>Nama Lengkap *</Label>
                                        <Input
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            data-testid="input-name"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label>Alamat *</Label>
                                        <Textarea
                                            required
                                            value={formData.address}
                                            onChange={e => setFormData({...formData, address: e.target.value})}
                                            data-testid="input-address"
                                        />
                                    </div>
                                    <div>
                                        <Label>Paket WiFi *</Label>
                                        <Input
                                            required
                                            value={formData.package}
                                            onChange={e => setFormData({...formData, package: e.target.value})}
                                            placeholder="Contoh: Premium 100Mbps"
                                            data-testid="input-package"
                                        />
                                    </div>
                                    <div>
                                        <Label>WiFi ID *</Label>
                                        <Input
                                            required
                                            value={formData.wifi_id}
                                            onChange={e => setFormData({...formData, wifi_id: e.target.value})}
                                            data-testid="input-wifi-id"
                                        />
                                    </div>
                                    <div>
                                        <Label>Tanggal Mulai Langganan *</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={formData.subscription_start_date}
                                            onChange={e =>
                                                setFormData({...formData, subscription_start_date: e.target.value})
                                            }
                                            data-testid="input-subscription-start"
                                        />
                                    </div>
                                    <div>
                                        <Label>Tanggal Jatuh Tempo *</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={formData.next_due_date}
                                            onChange={e => setFormData({...formData, next_due_date: e.target.value})}
                                            data-testid="input-due-date"
                                        />
                                    </div>

                                    {/* PHONE INPUT - UPDATED */}
                                    <div className="col-span-2">
                                        <Label>No. WhatsApp *</Label>
                                        <PhoneInput
                                            required
                                            value={formData.phone_whatsapp}
                                            onChange={value => setFormData({...formData, phone_whatsapp: value})}
                                            data-testid="input-phone"
                                        />
                                    </div>

                                    <div>
                                        <Label>Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={value => setFormData({...formData, status: value})}
                                        >
                                            <SelectTrigger data-testid="select-status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="active">Aktif</SelectItem>
                                                <SelectItem value="suspended">Suspended</SelectItem>
                                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* CURRENCY INPUTS - UPDATED */}
                                    <div className="col-span-2 border-t pt-4 mt-2">
                                        <h3 className="font-semibold text-slate-800 mb-3">
                                            Biaya Instalasi & Perangkat (One-Time)
                                        </h3>
                                    </div>
                                    <div>
                                        <Label>Harga Router *</Label>
                                        <CurrencyInput
                                            required
                                            value={formData.router_purchase_price}
                                            onChange={value => setFormData({...formData, router_purchase_price: value})}
                                            data-testid="input-router-price"
                                        />
                                    </div>
                                    <div>
                                        <Label>Biaya Registrasi & Instalasi *</Label>
                                        <CurrencyInput
                                            required
                                            value={formData.registration_fee}
                                            onChange={value => setFormData({...formData, registration_fee: value})}
                                            data-testid="input-registration-fee"
                                        />
                                    </div>
                                    <div>
                                        <Label>Diskon Instalasi</Label>
                                        <CurrencyInput
                                            value={formData.installation_discount}
                                            onChange={value => setFormData({...formData, installation_discount: value})}
                                            data-testid="input-installation-discount"
                                        />
                                    </div>
                                    <div>
                                        <Label>Biaya Lain-lain</Label>
                                        <CurrencyInput
                                            value={formData.other_fees}
                                            onChange={value => setFormData({...formData, other_fees: value})}
                                            data-testid="input-other-fees"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <Label>Catatan</Label>
                                        <Textarea
                                            value={formData.notes}
                                            onChange={e => setFormData({...formData, notes: e.target.value})}
                                            data-testid="input-notes"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                    data-testid="submit-customer-button"
                                >
                                    {loading ? "Menyimpan..." : editingCustomer ? "Update" : "Simpan"} Pelanggan
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200">
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                            size={20}
                        />
                        <Input
                            placeholder="Cari pelanggan (nama, ID, nomor WA, WiFi ID)..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            data-testid="search-input"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200">
                <CardHeader>
                    <CardTitle>Daftar Pelanggan ({customers.length})</CardTitle>
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
                                        <TableHead>ID</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Paket</TableHead>
                                        <TableHead>WiFi ID</TableHead>
                                        <TableHead>No. WhatsApp</TableHead>
                                        <TableHead>Jatuh Tempo</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map(customer => (
                                        <TableRow key={customer._id} data-testid={`customer-row-${customer._id}`}>
                                            <TableCell className="font-mono text-sm">{customer.customer_id}</TableCell>
                                            <TableCell className="font-semibold">{customer.name}</TableCell>
                                            <TableCell>{customer.package}</TableCell>
                                            <TableCell className="font-mono text-sm">{customer.wifi_id}</TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {formatPhoneDisplay(customer.phone_whatsapp)}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(customer.next_due_date).toLocaleDateString("id-ID")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={customer.status === "active" ? "default" : "secondary"}
                                                    className={customer.status === "active" ? "bg-green-500" : ""}
                                                >
                                                    {customer.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(customer)}
                                                        data-testid={`edit-${customer._id}`}
                                                    >
                                                        <Edit size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-rose-600 hover:text-rose-700"
                                                        onClick={() => handleDelete(customer._id)}
                                                        data-testid={`delete-${customer._id}`}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {customers.length === 0 && !loading && (
                                <div className="text-center py-8 text-slate-500">Belum ada data pelanggan</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Customers;
