import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, FileText, CheckCircle, AlertTriangle, TrendingUp, Send } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}`;

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [overdueList, setOverdueList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, overdueRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/dashboard/overdue`)
      ]);
      setStats(statsRes.data);
      setOverdueList(overdueRes.data);
    } catch (error) {
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Dashboard</h1>
        <p className="text-slate-600">Ringkasan sistem tagihan WiFi Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-card-customers">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Pelanggan</CardTitle>
            <Users className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.customers?.total || 0}</div>
            <p className="text-xs opacity-80 mt-1">{stats?.customers?.active || 0} aktif</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-card-invoices">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Invoice</CardTitle>
            <FileText className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.invoices?.total || 0}</div>
            <p className="text-xs opacity-80 mt-1">{stats?.invoices?.sent || 0} terkirim</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-card-paid">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Invoice Lunas</CardTitle>
            <CheckCircle className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.invoices?.paid || 0}</div>
            <p className="text-xs opacity-80 mt-1">Sudah dibayar</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="stat-card-overdue">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Jatuh Tempo</CardTitle>
            <AlertTriangle className="h-5 w-5 opacity-80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.invoices?.overdue || 0}</div>
            <p className="text-xs opacity-80 mt-1">Perlu tindakan</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Card */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-sky-200" data-testid="revenue-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <TrendingUp className="text-green-600" />
            Total Pendapatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Rp {(stats?.revenue || 0).toLocaleString('id-ID')}
          </div>
          <p className="text-sm text-slate-600 mt-2">Dari invoice yang sudah dibayar</p>
        </CardContent>
      </Card>

      {/* Overdue List */}
      {overdueList.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg border-rose-200" data-testid="overdue-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <AlertTriangle className="text-rose-600" />
              Tagihan Jatuh Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueList.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{item.customer_name}</p>
                    <p className="text-sm text-slate-600">Invoice: {item.invoice_number}</p>
                    <p className="text-sm text-rose-600">Jatuh tempo: {item.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">Rp {item.amount.toLocaleString('id-ID')}</p>
                    <Button size="sm" className="mt-2 bg-rose-600 hover:bg-rose-700" data-testid={`send-reminder-${item.id}`}>
                      <Send size={14} className="mr-1" />
                      Kirim Reminder
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
