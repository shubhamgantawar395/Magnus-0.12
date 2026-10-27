'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Package, Plus, Search, ArrowLeft, Loader2, Eye,
    Truck, FileCheck, Calendar, Hash, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface GRNItem {
    partNumber: string;
    partDescription: string | null;
    expectedQty: number;
    receivedQty: number;
    rejectedQty: number;
}

interface GRN {
    id: string;
    grnNumber: string;
    grnDate: string;
    status: 'draft' | 'received' | 'inspected';
    invoiceNumber: string | null;
    vehicleNumber: string | null;
    remarks: string | null;
    supplier: { id: string; companyName: string; supplierCode: string };
    purchaseOrder: { id: string; poNumber: string } | null;
    receivedBy: { id: string; firstName: string | null; lastName: string | null };
    items: GRNItem[];
}

const STATUS_CONFIG = {
    draft: { label: 'Draft', cls: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
    received: { label: 'Received', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    inspected: { label: 'Inspected', cls: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
};

export default function SupplierGRNPage() {
    const [grns, setGrns] = useState<GRN[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    const fetchGRNs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            const res = await apiClient.get(`/supplier-grn?${params}`);
            setGrns(res.data || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load GRNs');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(fetchGRNs, 400);
        return () => clearTimeout(t);
    }, [fetchGRNs]);

    const totalReceived = grns.reduce((s, g) => s + g.items.reduce((si, i) => si + i.receivedQty, 0), 0);
    const totalRejected = grns.reduce((s, g) => s + g.items.reduce((si, i) => si + i.rejectedQty, 0), 0);
    const totalAccepted = totalReceived - totalRejected;

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <div className="max-w-screen-xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/stock-statements" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Package className="w-6 h-6 text-emerald-400" />
                                Supplier GRN
                            </h1>
                            <p className="text-slate-500 text-sm">
                                Goods Receipt Notes — casting &amp; forging inward from suppliers
                            </p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard/supplier-grn/create"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" /> New GRN
                    </Link>
                </div>

                {/* KPI strip */}
                {grns.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total GRNs', value: grns.length, color: 'text-white' },
                            { label: 'Accepted Qty', value: totalAccepted.toLocaleString(), color: 'text-emerald-400' },
                            { label: 'Rejected Qty', value: totalRejected.toLocaleString(), color: 'text-red-400' },
                        ].map(c => (
                            <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                                <p className="text-xs text-slate-600 mb-1">{c.label}</p>
                                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by GRN number, supplier, invoice..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* GRN list */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    </div>
                ) : grns.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <h3 className="text-slate-400 font-semibold mb-1">No GRNs yet</h3>
                        <p className="text-slate-600 text-sm mb-4">Record supplier deliveries to track casting/forging inward.</p>
                        <Link
                            href="/dashboard/supplier-grn/create"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Create First GRN
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {grns.map(grn => {
                            const received = grn.items.reduce((s, i) => s + i.receivedQty, 0);
                            const rejected = grn.items.reduce((s, i) => s + i.rejectedQty, 0);
                            const accepted = received - rejected;
                            const statusCfg = STATUS_CONFIG[grn.status] || STATUS_CONFIG.received;

                            return (
                                <Link
                                    key={grn.id}
                                    href={`/dashboard/supplier-grn/${grn.id}`}
                                    className="block bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-5 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap mb-2">
                                                <span className="font-mono font-semibold text-white">{grn.grnNumber}</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${statusCfg.cls}`}>
                                                    <FileCheck className="w-3 h-3 mr-1" />{statusCfg.label}
                                                </span>
                                                {grn.purchaseOrder && (
                                                    <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                                                        PO: {grn.purchaseOrder.poNumber}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Truck className="w-3.5 h-3.5" />
                                                    {grn.supplier.companyName}
                                                    <span className="text-slate-600 text-xs">({grn.supplier.supplierCode})</span>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(grn.grnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </span>
                                                {grn.invoiceNumber && (
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="w-3.5 h-3.5" />
                                                        {grn.invoiceNumber}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Part pills */}
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {grn.items.map((item, idx) => (
                                                    <span key={idx} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                                                        {item.partNumber}: {(item.receivedQty - item.rejectedQty).toLocaleString()} accepted
                                                        {item.rejectedQty > 0 && <span className="text-red-400"> / {item.rejectedQty.toLocaleString()} rej</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-2xl font-bold text-emerald-400">{accepted.toLocaleString()}</p>
                                            <p className="text-xs text-slate-600">accepted</p>
                                            {rejected > 0 && <p className="text-xs text-red-400 mt-0.5">{rejected.toLocaleString()} rejected</p>}
                                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors mt-2 ml-auto" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
