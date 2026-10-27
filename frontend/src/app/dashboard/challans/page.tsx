'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Download, Plus, Eye, Loader2, Truck, ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/auth-store';

interface Challan {
    id: string;
    challanNumber: string;
    challanDate: string;
    poNumber?: string;
    vendor: { companyName: string; vendorCode: string };
    totalQuantity: number;
    status: string;
    _count?: { items: number };
    createdBy?: { firstName: string; lastName: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    issued: { label: 'Issued', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
    received: { label: 'Received', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    partial: { label: 'Partial', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export default function ChallansPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [challans, setChallans] = useState<Challan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const dashboardHref = (() => {
        const role = user?.role;
        if (!role) return '/dashboard';
        if (['admin', 'director', 'gm', 'ppc_manager', 'production_manager'].includes(role)) return '/dashboard/admin';
        if (role === 'executive') return '/dashboard/executive';
        if (['vendor', 'vendor_owner', 'vendor_ppc', 'vendor_supervisor', 'vendor_user'].includes(role)) return '/dashboard/vendor';
        return '/dashboard';
    })();

    const fetchChallans = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { limit: 100 };
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchTerm.trim()) params.search = searchTerm.trim();
            const res = await apiClient.get('/challans', { params });
            setChallans(res.data.data || []);
        } catch {
            toast.error('Failed to load challans');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchChallans(); }, [fetchChallans]);

    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return challans;
        const q = searchTerm.toLowerCase();
        return challans.filter(c =>
            c.challanNumber.toLowerCase().includes(q) ||
            c.vendor?.companyName?.toLowerCase().includes(q) ||
            c.poNumber?.toLowerCase().includes(q)
        );
    }, [challans, searchTerm]);

    const handleDownloadPdf = async (e: React.MouseEvent, id: string, challanNumber: string) => {
        e.stopPropagation();
        setDownloadingId(id);
        try {
            const response = await apiClient.get(`/challans/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${challanNumber}.pdf`;
            a.click();
            a.remove();
        } catch {
            toast.error('PDF generation failed');
        } finally {
            setDownloadingId(null);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const cfg = STATUS_CONFIG[status] || { label: status.toUpperCase(), color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: FileText };
        const Icon = cfg.icon;
        
        // Magnus v2.0 themed colors
        const themeColors: Record<string, string> = {
            issued: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
            received: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
            partial: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
            cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
        };

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${themeColors[status] || cfg.color}`}>
                <Icon className="h-3 w-3" />{cfg.label}
            </span>
        );
    };

    const stats = [
        { label: 'Total Issued', value: challans.length, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { label: 'Processing', value: challans.filter(c => c.status === 'issued').length, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Received', value: challans.filter(c => c.status === 'received').length, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Avg Quantity', value: Math.round(challans.reduce((s, c) => s + (c.totalQuantity || 0), 0) / (challans.length || 1)), icon: Truck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-8 space-y-8">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-5 h-5 text-indigo-500" />
                            <span className="text-indigo-400 text-sm font-bold uppercase tracking-widest">Operations Logs</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Delivery <span className="text-indigo-500">Challans</span></h1>
                        <p className="text-slate-500 mt-2 max-w-lg leading-relaxed font-medium">
                            Real-time tracking of material dispatched for vendor processing & job work.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={dashboardHref}>
                            <Button variant="outline" className="bg-slate-900/50 border-white/5 hover:bg-slate-800 text-slate-300 gap-2 px-6 py-6 rounded-2xl transition-all">
                                <ArrowLeft className="h-4 w-4" /> Dashboard
                            </Button>
                        </Link>
                        <Link href="/dashboard/challans/new">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6 py-6 rounded-2xl shadow-xl shadow-indigo-500/20 font-bold transition-all border-t border-indigo-400/20">
                                <Plus className="h-5 w-5" /> New Challan
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 ${s.bg} rounded-xl`}>
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-800 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <p className="text-3xl font-black text-white">{s.value}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Filters & Tools */}
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 transition-colors group-focus-within:text-indigo-500" />
                        <Input
                            className="bg-slate-900/50 border-white/5 focus:border-indigo-500/50 text-white pl-12 h-14 rounded-2xl placeholder:text-slate-600 transition-all"
                            placeholder="Search by challan number, vendor name, or PO number..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px] bg-slate-900/50 border-white/5 text-slate-300 h-14 rounded-2xl">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-slate-300">
                                <SelectItem value="all">Global Scan</SelectItem>
                                <SelectItem value="issued">Issued / Transit</SelectItem>
                                <SelectItem value="partial">Partial Return</SelectItem>
                                <SelectItem value="received">Archived / Received</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            className="bg-slate-900/50 border-white/5 hover:bg-slate-800 text-slate-300 h-14 rounded-2xl px-6"
                            onClick={() => fetchChallans()}
                        >
                            <Download className="h-5 w-5 mr-2 text-indigo-400" />
                            Export Data
                        </Button>
                    </div>
                </div>

                {/* Interactive Log Table */}
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent uppercase">
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest pl-8">Log Reference</TableHead>
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest">Entry Date</TableHead>
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest">Vendor Context</TableHead>
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest">Linked PO</TableHead>
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest text-right">Qty</TableHead>
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest text-center">Flow Status</TableHead>
                                <TableHead className="text-slate-500 font-bold text-[10px] tracking-widest text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow className="border-transparent">
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
                                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Deciphering Logs...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow className="border-transparent">
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-4 py-10 opacity-30">
                                            <Truck className="h-16 w-16 text-slate-400" />
                                            <p className="text-slate-400 font-bold">No operational logs found matching query</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map(c => (
                                    <TableRow
                                        key={c.id}
                                        className="border-white/5 hover:bg-indigo-500/5 cursor-pointer group transition-colors"
                                        onClick={() => router.push(`/dashboard/challans/${c.id}`)}
                                    >
                                        <TableCell className="pl-8 py-5">
                                            <div className="font-mono font-black text-indigo-500 text-sm">{c.challanNumber}</div>
                                            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">
                                                By {c.createdBy?.firstName || 'System'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-white font-medium text-sm">{format(new Date(c.challanDate), 'dd MMM, yyyy')}</div>
                                            <div className="text-[10px] text-slate-600 font-bold uppercase mt-0.5">{format(new Date(c.challanDate), 'HH:mm')}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors uppercase truncate max-w-[200px]">
                                                {c.vendor?.companyName}
                                            </div>
                                            <div className="text-[10px] text-slate-600 font-bold flex items-center gap-2 mt-0.5">
                                                <div className="w-1 h-1 bg-slate-700 rounded-full" /> {c.vendor?.vendorCode}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {c.poNumber ? (
                                                <div className="font-mono text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-white/5 inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                    {c.poNumber}
                                                </div>
                                            ) : (
                                                <span className="text-slate-700 text-xs font-bold">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-white font-bold text-sm tracking-tight">{c.totalQuantity.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-600 font-bold uppercase">{c._count?.items ?? 0} SKUs</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge status={c.status} />
                                        </TableCell>
                                        <TableCell className="text-right pr-8" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all"
                                                    onClick={() => router.push(`/dashboard/challans/${c.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 bg-slate-800/50 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-xl border border-white/5 transition-all"
                                                    onClick={e => handleDownloadPdf(e, c.id, c.challanNumber)}
                                                    disabled={downloadingId === c.id}
                                                >
                                                    {downloadingId === c.id ? <Loader2 className="h-4 h-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

