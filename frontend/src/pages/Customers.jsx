import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Upload, Edit, Trash2, Send } from 'lucide-react';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
// const API = `${BACKEND_URL}/api`; //Before
const API = `${BACKEND_URL}`;

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    address: '',
    package: '',
    start_date: '',
    next_due_date: '',
    phone_whatsapp: '',
    wifi_id: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/customers`, {
        params: { q: searchQuery }
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, formData);
        toast.success('Pelanggan berhasil diupdate');
      } else {
        await axios.post(`${API}/customers`, formData);
        toast.success('Pelanggan berhasil ditambahkan');
      }
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus pelanggan ini?')) return;
    try {
      await axios.delete(`${API}/customers/${id}`);
      toast.success('Pelanggan berhasil dihapus');
      fetchCustomers();
    } catch (error) {
      toast.error('Gagal menghapus pelanggan');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      customer_id: '',
      name: '',
      address: '',
      package: '',
      start_date: '',
      next_due_date: '',
      phone_whatsapp: '',
      wifi_id: '',
      status: 'active',
      notes: ''
    });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/customers/import`, formData);
      toast.success(`${response.data.imported} pelanggan berhasil diimport`);
      if (response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
      }
      setImportDialogOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal import data');
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
                  Upload file CSV atau Excel dengan kolom: customer_id, name, address, package, start_date, next_due_date, phone_whatsapp, wifi_id
                </p>
                <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} data-testid="file-input" />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700" data-testid="add-customer-button">
                <Plus size={16} />
                Tambah Pelanggan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="customer-form-dialog">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID Pelanggan *</Label>
                    <Input
                      required
                      value={formData.customer_id}
                      onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                      data-testid="input-customer-id"
                    />
                  </div>
                  <div>
                    <Label>Nama Lengkap *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      data-testid="input-name"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Alamat *</Label>
                    <Textarea
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      data-testid="input-address"
                    />
                  </div>
                  <div>
                    <Label>Paket WiFi *</Label>
                    <Input
                      required
                      value={formData.package}
                      onChange={(e) => setFormData({...formData, package: e.target.value})}
                      placeholder="Contoh: Premium 100Mbps"
                      data-testid="input-package"
                    />
                  </div>
                  <div>
                    <Label>WiFi ID *</Label>
                    <Input
                      required
                      value={formData.wifi_id}
                      onChange={(e) => setFormData({...formData, wifi_id: e.target.value})}
                      data-testid="input-wifi-id"
                    />
                  </div>
                  <div>
                    <Label>Tanggal Mulai *</Label>
                    <Input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label>Tanggal Jatuh Tempo *</Label>
                    <Input
                      type="date"
                      required
                      value={formData.next_due_date}
                      onChange={(e) => setFormData({...formData, next_due_date: e.target.value})}
                      data-testid="input-due-date"
                    />
                  </div>
                  <div>
                    <Label>No. WhatsApp *</Label>
                    <Input
                      required
                      value={formData.phone_whatsapp}
                      onChange={(e) => setFormData({...formData, phone_whatsapp: e.target.value})}
                      placeholder="628123456789"
                      data-testid="input-phone"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
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
                  <div className="col-span-2">
                    <Label>Catatan</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" data-testid="submit-customer-button">
                  {editingCustomer ? 'Update' : 'Simpan'} Pelanggan
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <Input
              placeholder="Cari pelanggan (nama, ID, nomor WA, WiFi ID)..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                    <TableHead>No. WA</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                      <TableCell className="font-mono text-sm">{customer.customer_id}</TableCell>
                      <TableCell className="font-semibold">{customer.name}</TableCell>
                      <TableCell>{customer.package}</TableCell>
                      <TableCell className="font-mono text-sm">{customer.wifi_id}</TableCell>
                      <TableCell>{customer.phone_whatsapp}</TableCell>
                      <TableCell>{customer.next_due_date}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={customer.status === 'active' ? 'default' : 'secondary'}
                          className={customer.status === 'active' ? 'bg-green-500' : ''}
                        >
                          {customer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(customer)} data-testid={`edit-${customer.id}`}>
                            <Edit size={14} />
                          </Button>
                          <Button size="sm" variant="outline" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(customer.id)} data-testid={`delete-${customer.id}`}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {customers.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Belum ada data pelanggan
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Customers;
