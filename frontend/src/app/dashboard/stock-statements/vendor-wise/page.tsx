'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Search, Filter, Download, Layers, ArrowLeft, Loader2,
    ChevronDown, ChevronUp, AlertTriangle, Package, Truck,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type Priority = 'urgent' | 'at_risk' | 'on_track' | 'ok';

interface VendorWiseRow {
    srNo: number;
    challanNumber: string;
    challanDate: string;
    itemName: string;
    partNumber: string;
    partName: string;
    materialType: string | null;
    supplierName: string | null;
    dispatchTarget: number;
    challanQty: number;
    dispatchQty: number;
    balanceQty: number;
    castingDefects: number;
    rejections: number;
    wip: number;
    storeBalance: number;
    pendingFromSupplier: number;
    priority: Priority;
}

interface VendorGroup {
    vendorId: string;
    vendorName: string;
    rows: VendorWiseRow[];
    totals: {
        challanQty: number;
        dispatchQty: number;
        balanceQty: number;
        castingDefects: number;
        rejections: number;
        wip: number;
        urgentParts: number;
        storeBalance: number;
        pendingFromSupplier: number;
    };
}

interface Vendor { id: string; companyName: string; vendorCode: string; }

// ── Constants ─────────────────────────────────────────────────────────────────

const MATERIAL_TYPES = ['casting', 'forging', 'sheet_metal', 'bar_stock', 'rubber', 'other'];

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string; row: string; badge: string }> = {
    urgent:   { label: 'Urgent',   dot: 'bg-red-500',    row: 'border-l-2 border-red-500 bg-red-500/5',    badge: 'bg-red-500/15 text-red-400 border-red-500/30' },
    at_risk:  { label: 'At Risk',  dot: 'bg-amber-500',  row: 'border-l-2 border-amber-500 bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    on_track: { label: 'On Track', dot: 'bg-sky-500',    row: 'border-l-2 border-sky-500 bg-sky-500/5',    badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    ok:       { label: 'OK',       dot: 'bg-emerald-500',row: '',                                           badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const MAT_COLORS: Record<string, string> = {
    casting:    'bg-orange-500/15 text-orange-300 border-orange-500/30',
    forging:    'bg-purple-500/15 text-purple-300 border-purple-500/30',
    sheet_metal:'bg-sky-500/15 text-sky-300 border-sky-500/30',
    bar_stock:  'bg-lime-500/15 text-lime-300 border-lime-500/30',
    rubber:     'bg-pink-500/15 text-pink-300 border-pink-500/30',
    other:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(groups: VendorGroup[]) {
    const headers = [
        'Sr.No', 'Vendor', 'Challan No', 'Challan Date', 'Part No', 'Part Name',
        'Material Type', 'Supplier', 'Challan Qty', 'Dispatch Qty', 'Balance Qty',
        'Cast/Forg Defects', 'Rejections', 'WIP', 'Store Balance', 'Pending from Supplier', 'Dispatch Target', 'Priority',
    ];
    const rows: string[][] = [headers];

    for (const grp of groups) {
        for (const r of grp.rows) {
            rows.push([
                String(r.srNo), grp.vendorName, r.challanNumber,
                new Date(r.challanDate).toLocaleDateString('en-IN'),
                r.partNumber, r.partName,
                r.materialType || '', r.supplierName || '',
                String(r.challanQty), String(r.dispatchQty), String(r.balanceQty),
                String(r.castingDefects), String(r.rejections), String(r.wip),
                String(r.storeBalance || 0), String(r.pendingFromSupplier || 0),
                String(r.dispatchTarget), r.priority,
            ]);
        }
        rows.push([
            '', `${grp.vendorName} TOTALS`, '', '', '', '', '', '',
            String(grp.totals.challanQty), String(grp.totals.dispatchQty),
            String(grp.totals.balanceQty), String(grp.totals.castingDefects),
            String(grp.totals.rejections), String(grp.totals.wip),
            String(grp.totals.storeBalance || 0), String(grp.totals.pendingFromSupplier || 0), '', '',
        ]);
    }

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `vendor-wise-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Num({ v, warn, danger }: { v: number; warn?: boolean; danger?: boolean }) {
    const cls = danger && v > 0 ? 'text-red-400 font-semibold'
        : warn && v > 0 ? 'text-amber-400 font-semibold'
            : v === 0 ? 'text-slate-700'
                : 'text-white';
    return <span className={cls}>{v > 0 ? v.toLocaleString() : '—'}</span>;
}

function MatBadge({ type }: { type: string | null }) {
    if (!type) return null;
    const cls = MAT_COLORS[type] || MAT_COLORS.other;
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
            {type.replace('_', ' ')}
        </span>
    );
}

function PriorityBadge({ p }: { p: Priority }) {
    const cfg = PRIORITY_CONFIG[p];
    if (p === 'ok') return null;
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VendorWiseStockPage() {
    const [groups, setGroups] = useState<VendorGroup[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(false);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [materialType, setMaterialType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchVendors = useCallback(async () => {
        try {
            const res = await apiClient.get('/vendors?limit=200');
            setVendors(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (vendorId) params.set('vendorId', vendorId);
            if (materialType) params.set('materialType', materialType);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const res = await apiClient.get(`/reports/vendor-wise-stock?${params}`);
            setGroups(res.data || []);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [search, vendorId, materialType, dateFrom, dateTo]);

    useEffect(() => { fetchVendors(); }, [fetchVendors]);
    useEffect(() => {
        const t = setTimeout(fetchData, 400);
        return () => clearTimeout(t);
    }, [fetchData]);

    const toggleCollapse = (vId: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            next.has(vId) ? next.delete(vId) : next.add(vId);
            return next;
        });
    };

    const { totalRows, grandTotals, urgentCount } = useMemo(() => {
        const totalRows = groups.reduce((s, g) => s + g.rows.length, 0);
        const urgentCount = groups.reduce((s, g) => s + g.totals.urgentParts, 0);
        const grandTotals = groups.reduce(
            (acc, g) => ({
                challanQty: acc.challanQty + g.totals.challanQty,
                dispatchQty: acc.dispatchQty + g.totals.dispatchQty,
                balanceQty: acc.balanceQty + g.totals.balanceQty,
                castingDefects: acc.castingDefects + g.totals.castingDefects,
                rejections: acc.rejections + g.totals.rejections,
                wip: acc.wip + g.totals.wip,
                storeBalance: acc.storeBalance + (g.totals.storeBalance || 0),
                pendingFromSupplier: acc.pendingFromSupplier + (g.totals.pendingFromSupplier || 0),
            }),
            { challanQty: 0, dispatchQty: 0, balanceQty: 0, castingDefects: 0, rejections: 0, wip: 0, storeBalance: 0, pendingFromSupplier: 0 }
        );
        return { totalRows, grandTotals, urgentCount };
    }, [groups]);

    const hasFilters = !!(search || vendorId || materialType || dateFrom || dateTo);
    const clearFilters = () => { setSearch(''); setVendorId(''); setMaterialType(''); setDateFrom(''); setDateTo(''); };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <div className="max-w-screen-2xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/stock-statements" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Layers className="w-6 h-6 text-indigo-400" />
                                Vendor Wise Stock Statement
                            </h1>
                            <p className="text-slate-500 text-sm">
                                Per-vendor challan lifecycle — issued, dispatched, balance, defects, WIP &amp; priority
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/suppliers"
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                            <Package className="w-4 h-4" /> Suppliers
                        </Link>
                        <button
                            onClick={() => exportCSV(groups)}
                            disabled={groups.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>

                {/* ── Urgent alert banner ── */}
                {urgentCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                            <strong>{urgentCount}</strong> challan item{urgentCount !== 1 ? 's' : ''} marked <strong>Urgent</strong> — high balance relative to dispatch target or excessive rejections.
                        </span>
                    </div>
                )}

                {/* ── KPI strip ── */}
                {groups.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {[
                            { label: 'Challan Qty', value: grandTotals.challanQty, color: 'text-white' },
                            { label: 'Dispatched Back', value: grandTotals.dispatchQty, color: 'text-emerald-400' },
                            { label: 'Balance at Vendors', value: grandTotals.balanceQty, color: 'text-amber-400' },
                            { label: 'Cast./Forg. Defects', value: grandTotals.castingDefects, color: 'text-orange-400' },
                            { label: 'Rejections', value: grandTotals.rejections, color: 'text-red-400' },
                            { label: 'WIP', value: grandTotals.wip, color: 'text-sky-400' },
                            { label: 'Store Balance', value: grandTotals.storeBalance, color: 'text-teal-400' },
                            { label: 'Pending from Supplier', value: grandTotals.pendingFromSupplier, color: 'text-violet-400' },
                        ].map(card => (
                            <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                                <p className="text-xs text-slate-600 mb-1">{card.label}</p>
                                <p className={`text-xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Filters ── */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text" placeholder="Search challan, part, vendor, supplier…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <select
                            value={vendorId} onChange={e => setVendorId(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All Vendors</option>
                            {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.companyName} ({v.vendorCode})</option>
                            ))}
                        </select>
                        <select
                            value={materialType} onChange={e => setMaterialType(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">All Materials</option>
                            {MATERIAL_TYPES.map(m => (
                                <option key={m} value={m}>{m.replace('_', ' ')}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="mt-3 text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <Filter className="w-3.5 h-3.5" /> Clear filters
                        </button>
                    )}
                </div>

                {/* ── Content ── */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                            <p className="text-slate-500 text-sm">Loading stock data…</p>
                        </div>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-20">
                        <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <h3 className="text-slate-400 font-semibold mb-1">No data found</h3>
                        <p className="text-slate-600 text-sm">No challans match the current filters. Try expanding the date range or clearing filters.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-slate-500 text-sm">
                            <span className="text-white font-medium">{groups.length}</span> vendor{groups.length !== 1 ? 's' : ''} ·{' '}
                            <span className="text-white font-medium">{totalRows}</span> challan item{totalRows !== 1 ? 's' : ''}
                        </p>

                        {groups.map(grp => (
                            <VendorCard
                                key={grp.vendorId}
                                grp={grp}
                                collapsed={collapsed.has(grp.vendorId)}
                                onToggle={() => toggleCollapse(grp.vendorId)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── VendorCard ────────────────────────────────────────────────────────────────

function VendorCard({ grp, collapsed, onToggle }: {
    grp: VendorGroup;
    collapsed: boolean;
    onToggle: () => void;
}) {
    const hasUrgent = grp.totals.urgentParts > 0;

    return (
        <div className={`bg-slate-900 border rounded-xl overflow-hidden ${hasUrgent ? 'border-red-500/40' : 'border-slate-800'}`}>
            {/* Vendor header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <span className="font-semibold text-white">{grp.vendorName}</span>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">{grp.rows.length} challans</span>
                    {grp.totals.urgentParts > 0 && (
                        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {grp.totals.urgentParts} urgent
                        </span>
                    )}
                    {grp.totals.balanceQty > 0 && (
                        <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            {grp.totals.balanceQty.toLocaleString()} balance
                        </span>
                    )}
                    {grp.totals.rejections > 0 && (
                        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                            {grp.totals.rejections.toLocaleString()} rejected
                        </span>
                    )}
                    {grp.totals.wip > 0 && (
                        <span className="text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                            {grp.totals.wip.toLocaleString()} WIP
                        </span>
                    )}
                </div>
                {collapsed
                    ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    : <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                }
            </button>

            {!collapsed && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-900/60 text-slate-500 font-medium border-b border-slate-800 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 w-10">Sr.</th>
                                <th className="px-4 py-3">Challan No</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Part</th>
                                <th className="px-4 py-3">Material / Supplier</th>
                                <th className="px-4 py-3 text-right">Challan Qty</th>
                                <th className="px-4 py-3 text-right text-emerald-400/80">Dispatched</th>
                                <th className="px-4 py-3 text-right text-amber-400/80">Balance</th>
                                <th className="px-4 py-3 text-right text-orange-400/80">Defects</th>
                                <th className="px-4 py-3 text-right text-red-400/80">Rejections</th>
                                <th className="px-4 py-3 text-right text-sky-400/80">WIP</th>
                                <th className="px-4 py-3 text-right text-teal-400/80">Store Bal</th>
                                <th className="px-4 py-3 text-right text-violet-400/80">Pending Supplier</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {grp.rows.map(row => {
                                const rowCls = PRIORITY_CONFIG[row.priority].row;
                                return (
                                    <tr key={`${row.challanNumber}-${row.srNo}`} className={`hover:bg-slate-800/30 transition-colors ${rowCls}`}>
                                        <td className="px-4 py-3 text-slate-600 text-xs">{row.srNo}</td>
                                        <td className="px-4 py-3 font-mono text-indigo-400 font-medium">{row.challanNumber}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {new Date(row.challanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs">
                                            <div className="font-mono text-white font-medium text-xs">{row.partNumber}</div>
                                            {row.partName && (
                                                <div className="text-xs text-slate-500 truncate max-w-[180px]">{row.partName}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <MatBadge type={row.materialType} />
                                                {row.supplierName && (
                                                    <span className="text-xs text-slate-500 truncate max-w-[140px]">{row.supplierName}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-white">{row.challanQty.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-emerald-400">
                                            {row.dispatchQty > 0 ? row.dispatchQty.toLocaleString() : <span className="text-slate-700">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right"><Num v={row.balanceQty} warn /></td>
                                        <td className="px-4 py-3 text-right"><Num v={row.castingDefects} danger /></td>
                                        <td className="px-4 py-3 text-right"><Num v={row.rejections} danger /></td>
                                        <td className="px-4 py-3 text-right"><Num v={row.wip} warn /></td>
                                        <td className="px-4 py-3 text-right">
                                            {(row.storeBalance || 0) > 0
                                                ? <span className="text-teal-400 font-semibold">{row.storeBalance.toLocaleString()}</span>
                                                : <span className="text-slate-700">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {(row.pendingFromSupplier || 0) > 0
                                                ? <span className="text-violet-400 font-semibold">{row.pendingFromSupplier.toLocaleString()}</span>
                                                : <span className="text-slate-700">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <PriorityBadge p={row.priority} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {/* Vendor totals row */}
                        <tfoot className="bg-slate-800/40 text-xs font-semibold border-t border-slate-700">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-slate-400 uppercase tracking-wider">Vendor Total</td>
                                <td className="px-4 py-3 text-right text-white">{grp.totals.challanQty.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-emerald-400">{grp.totals.dispatchQty.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-amber-400">{grp.totals.balanceQty > 0 ? grp.totals.balanceQty.toLocaleString() : '—'}</td>
                                <td className="px-4 py-3 text-right text-orange-400">{grp.totals.castingDefects > 0 ? grp.totals.castingDefects.toLocaleString() : '—'}</td>
                                <td className="px-4 py-3 text-right text-red-400">{grp.totals.rejections > 0 ? grp.totals.rejections.toLocaleString() : '—'}</td>
                                <td className="px-4 py-3 text-right text-sky-400">{grp.totals.wip > 0 ? grp.totals.wip.toLocaleString() : '—'}</td>
                                <td className="px-4 py-3 text-right text-teal-400">{(grp.totals.storeBalance || 0) > 0 ? grp.totals.storeBalance.toLocaleString() : '—'}</td>
                                <td className="px-4 py-3 text-right text-violet-400">{(grp.totals.pendingFromSupplier || 0) > 0 ? grp.totals.pendingFromSupplier.toLocaleString() : '—'}</td>
                                <td className="px-4 py-3" />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
