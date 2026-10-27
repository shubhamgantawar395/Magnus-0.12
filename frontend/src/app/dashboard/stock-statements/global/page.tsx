'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Search, Filter, Download, Globe, ArrowLeft, Loader2,
    ChevronDown, ChevronUp, AlertTriangle, Factory,
    Pencil, Check, X,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OperationStock {
    sequenceNumber: number;
    operationName: string;
    executionType: 'inhouse' | 'outsourced';
    assignedTo: string;
    vendorId: string | null;
    qtySent: number;
    qtyReceived: number;
    qtyInProgress: number;
}

interface VendorBreakdown {
    vendorId: string; vendorName: string; vendorCode: string;
    balance: number; currentStage: string | null; wip: number;
}

interface GlobalStockRow {
    srNo: number; partNumber: string; partName: string; endCustomer: string | null;
    materialType: string | null; supplierName: string | null; supplierId: string | null;
    customerRequiredQty: number; qtyOrderedThisMonth: number; qtyReceivedTillNow: number;
    totalProcured: number; totalDispatchedBack: number; balanceAtVendors: number;
    totalRejected: number; readyForDispatch: number; dispatchTarget: number;
    receivedFromSupplier: number; storeBalance: number; pendingFromSupplier: number;
    operations: OperationStock[]; vendorBreakdown: VendorBreakdown[];
    lastChallanDate: string | null; priority: 'urgent' | 'at_risk' | 'on_track' | 'ok';
}

interface GlobalStockData {
    rows: GlobalStockRow[];
    totals: {
        customerRequiredQty: number; qtyOrderedThisMonth: number; totalProcured: number;
        totalDispatchedBack: number; balanceAtVendors: number; totalRejected: number; readyForDispatch: number;
        receivedFromSupplier: number; storeBalance: number; pendingFromSupplier: number;
    };
}

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
    urgent:   { label: 'Urgent',   border: 'border-l-red-500',     badge: 'bg-red-500/15 text-red-400',     dot: 'bg-red-500' },
    at_risk:  { label: 'At Risk',  border: 'border-l-amber-500',   badge: 'bg-amber-500/15 text-amber-400', dot: 'bg-amber-500' },
    on_track: { label: 'On Track', border: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-500' },
    ok:       { label: 'OK',       border: 'border-l-slate-700',   badge: 'bg-slate-800 text-slate-500',    dot: 'bg-slate-600' },
};

const MAT_COLOR: Record<string, string> = {
    casting: 'bg-orange-500/15 text-orange-400', forging: 'bg-blue-500/15 text-blue-400',
    sheet_metal: 'bg-slate-500/15 text-slate-300', bar_stock: 'bg-yellow-500/15 text-yellow-400',
    rubber: 'bg-green-500/15 text-green-400', other: 'bg-purple-500/15 text-purple-400',
};

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(data: GlobalStockData) {
    const h = ['Sr.', 'Priority', 'Part Number', 'Part Name', 'Customer', 'Material Type', 'Supplier',
        'Customer Demand', 'Ordered This Month', 'Received Till Now', 'Total Sent', 'Returned',
        'Balance at Vendors', 'Rejected', 'Ready', 'Target',
        'Rcvd from Supplier', 'Store Balance', 'Pending from Supplier',
        'Operations', 'Last Challan'];
    const rows = [h, ...data.rows.map(r => [
        r.srNo, r.priority, r.partNumber, r.partName, r.endCustomer || '', r.materialType || '', r.supplierName || '',
        r.customerRequiredQty, r.qtyOrderedThisMonth, r.qtyReceivedTillNow,
        r.totalProcured, r.totalDispatchedBack, r.balanceAtVendors,
        r.totalRejected, r.readyForDispatch, r.dispatchTarget,
        r.receivedFromSupplier || 0, r.storeBalance || 0, r.pendingFromSupplier || 0,
        r.operations.map(o => `OP${o.sequenceNumber} ${o.operationName}(${o.assignedTo}):sent=${o.qtySent},rcvd=${o.qtyReceived}`).join(' | '),
        r.lastChallanDate ? new Date(r.lastChallanDate).toLocaleDateString('en-IN') : '',
    ])];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `global-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// ── Dispatch Target inline edit ───────────────────────────────────────────────

function TargetCell({ partNumber, value, onSaved }: { partNumber: string; value: number; onSaved: (v: number) => void }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(value));
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

    const save = async () => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n < 0) { toast.error('Invalid number'); return; }
        try {
            await apiClient.patch(`/parts/by-number/${encodeURIComponent(partNumber)}/dispatch-target`, { dispatchTarget: n });
            onSaved(n); setEditing(false);
        } catch { toast.error('Could not save target'); }
    };

    if (editing) return (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input ref={ref} type="number" min={0} value={val} onChange={e => setVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                className="w-16 px-2 py-0.5 bg-slate-800 border border-blue-500 rounded text-white text-xs focus:outline-none" />
            <button onClick={save} className="text-emerald-400"><Check className="w-3 h-3" /></button>
            <button onClick={() => setEditing(false)} className="text-slate-500"><X className="w-3 h-3" /></button>
        </div>
    );
    return (
        <button onClick={e => { e.stopPropagation(); setVal(String(value)); setEditing(true); }}
            className="flex items-center gap-1 text-slate-300 hover:text-white group">
            <span className="font-medium">{value || '—'}</span>
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        </button>
    );
}

// ── Operations panel ──────────────────────────────────────────────────────────

function OpsPanel({ ops }: { ops: OperationStock[] }) {
    if (!ops.length) return <p className="text-xs text-slate-700 italic">No operations defined</p>;
    return (
        <table className="w-full text-xs">
            <thead>
                <tr className="text-slate-600 border-b border-slate-800">
                    <th className="py-1 pr-3 text-left">Seq</th>
                    <th className="py-1 pr-3 text-left">Operation</th>
                    <th className="py-1 pr-3 text-left">Assigned To</th>
                    <th className="py-1 pr-3 text-right text-indigo-400/80">Sent</th>
                    <th className="py-1 pr-3 text-right text-emerald-400/80">Received</th>
                    <th className="py-1 text-right text-amber-400/80">In Progress</th>
                </tr>
            </thead>
            <tbody>
                {ops.map(op => (
                    <tr key={op.sequenceNumber} className="border-b border-slate-800/40 last:border-0">
                        <td className="py-1.5 pr-3 text-slate-500 font-mono">{op.sequenceNumber}</td>
                        <td className="py-1.5 pr-3 text-slate-300">{op.operationName}</td>
                        <td className="py-1.5 pr-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${op.executionType === 'inhouse' ? 'bg-slate-700 text-slate-300' : 'bg-blue-500/15 text-blue-400'}`}>
                                {op.assignedTo}
                            </span>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-indigo-400 font-medium">{op.qtySent || '—'}</td>
                        <td className="py-1.5 pr-3 text-right text-emerald-400 font-medium">{op.qtyReceived || '—'}</td>
                        <td className="py-1.5 text-right">
                            {op.qtyInProgress > 0 ? <span className="text-amber-400 font-medium">{op.qtyInProgress}</span> : <span className="text-slate-700">—</span>}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GlobalStockPage() {
    const [data, setData] = useState<GlobalStockData | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [endCustomerId, setEndCustomerId] = useState('');
    const [vendorId, setVendorId] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [vendors, setVendors] = useState<any[]>([]);
    const [endCustomers, setEndCustomers] = useState<any[]>([]);

    const fetchLookups = useCallback(async () => {
        try {
            const [vr, ecr] = await Promise.all([apiClient.get('/vendors?limit=200'), apiClient.get('/parts/customers')]);
            setVendors(vr.data.data || []);
            setEndCustomers(ecr.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (search) p.set('search', search);
            if (endCustomerId) p.set('endCustomerId', endCustomerId);
            if (vendorId) p.set('vendorId', vendorId);
            if (dateFrom) p.set('dateFrom', dateFrom);
            if (dateTo) p.set('dateTo', dateTo);
            const res = await apiClient.get(`/reports/global-stock?${p}`);
            setData(res.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, [search, endCustomerId, vendorId, dateFrom, dateTo]);

    useEffect(() => { fetchLookups(); }, [fetchLookups]);
    useEffect(() => { const t = setTimeout(fetchData, 400); return () => clearTimeout(t); }, [fetchData]);

    const toggle = (pn: string) => setExpanded(prev => { const n = new Set(prev); n.has(pn) ? n.delete(pn) : n.add(pn); return n; });

    const updTarget = (pn: string, v: number) => setData(d => d ? { ...d, rows: d.rows.map(r => r.partNumber === pn ? { ...r, dispatchTarget: v } : r) } : d);

    const rows = useMemo(() => (data?.rows ?? []).filter(r => !priorityFilter || r.priority === priorityFilter), [data, priorityFilter]);
    const totals = data?.totals;
    const hasFilters = !!(search || endCustomerId || vendorId || dateFrom || dateTo || priorityFilter);
    const urgentCount = rows.filter(r => r.priority === 'urgent').length;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-6">
            <div className="max-w-screen-2xl mx-auto space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/stock-statements" className="text-slate-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
                        <div>
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-400" /> Global Stock Statement
                            </h1>
                            <p className="text-slate-500 text-xs">Supplier → operations → dispatch · all auto-fetched</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/suppliers" className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
                            <Factory className="w-4 h-4 text-orange-400" /> Suppliers
                        </Link>
                        <button onClick={() => data && exportCSV(data)} disabled={!data || !rows.length}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>

                {/* KPI strip */}
                {totals && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                        {[
                            { label: 'Customer Demand', v: totals.customerRequiredQty, c: 'text-sky-400' },
                            { label: 'Ordered This Month', v: totals.qtyOrderedThisMonth, c: 'text-indigo-400' },
                            { label: 'Total Sent', v: totals.totalProcured, c: 'text-blue-400' },
                            { label: 'Returned', v: totals.totalDispatchedBack, c: 'text-emerald-400' },
                            { label: 'At Vendors', v: totals.balanceAtVendors, c: 'text-amber-400' },
                            { label: 'Rejected', v: totals.totalRejected, c: 'text-red-400' },
                            { label: 'Ready for Dispatch', v: totals.readyForDispatch, c: 'text-violet-400' },
                            { label: 'Rcvd from Supplier', v: totals.receivedFromSupplier || 0, c: 'text-orange-400' },
                            { label: 'Store Balance', v: totals.storeBalance || 0, c: 'text-teal-400' },
                            { label: 'Pending Supplier', v: totals.pendingFromSupplier || 0, c: 'text-pink-400' },
                        ].map(c => (
                            <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                                <p className="text-xs text-slate-600 mb-1">{c.label}</p>
                                <p className={`text-xl font-bold ${c.c}`}>{c.v.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="relative col-span-2 sm:col-span-1 lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input placeholder="Part, customer, supplier…" value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500" />
                        </div>
                        <select value={endCustomerId} onChange={e => setEndCustomerId(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                            <option value="">All Customers</option>
                            {endCustomers.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
                        </select>
                        <select value={vendorId} onChange={e => setVendorId(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                            <option value="">All Vendors</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                        </select>
                        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                            <option value="">All Priorities</option>
                            <option value="urgent">🔴 Urgent</option>
                            <option value="at_risk">🟠 At Risk</option>
                            <option value="on_track">🟢 On Track</option>
                            <option value="ok">⚪ OK</option>
                        </select>
                        <div className="flex gap-2">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="flex-1 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="flex-1 px-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
                        </div>
                    </div>
                    {hasFilters && (
                        <button onClick={() => { setSearch(''); setEndCustomerId(''); setVendorId(''); setDateFrom(''); setDateTo(''); setPriorityFilter(''); }}
                            className="mt-3 text-xs text-slate-500 hover:text-white flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5" /> Clear filters
                        </button>
                    )}
                </div>

                {/* Alert banner */}
                {urgentCount > 0 && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span><strong>{urgentCount} part(s) are urgent</strong> — dispatch target critically behind or material shortage.</span>
                    </div>
                )}

                {/* Rows */}
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-20">
                        <Globe className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-semibold">No parts found</p>
                        <p className="text-slate-600 text-sm mt-1">Issue challans to vendors to see parts appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <p className="text-slate-600 text-xs">
                            <span className="text-white font-medium">{rows.length}</span> parts
                            {urgentCount > 0 && <> · <span className="text-red-400 font-medium">{urgentCount} urgent</span></>}
                        </p>

                        {rows.map(row => {
                            const cfg = PRIORITY_CFG[row.priority];
                            const isExpanded = expanded.has(row.partNumber);
                            return (
                                <div key={row.partNumber} className={`border border-slate-800 rounded-xl overflow-hidden border-l-4 ${cfg.border}`}>

                                    {/* Main row */}
                                    <div className="px-4 py-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
                                        onClick={() => toggle(row.partNumber)}>
                                        <div className="flex items-start gap-3">
                                            {/* Priority dot + Sr */}
                                            <div className="flex items-center gap-2 pt-0.5 flex-shrink-0">
                                                <span className="text-slate-700 text-xs w-4">{row.srNo}</span>
                                                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} title={cfg.label} />
                                            </div>

                                            {/* Part identity */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono font-semibold text-white">{row.partNumber}</span>
                                                    {row.partName && <span className="text-xs text-slate-500">{row.partName}</span>}
                                                    {row.endCustomer && (
                                                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{row.endCustomer}</span>
                                                    )}
                                                    {row.materialType && (
                                                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${MAT_COLOR[row.materialType] || 'bg-slate-800 text-slate-400'}`}>
                                                            {row.materialType.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                    {row.supplierName && (
                                                        <span className="text-xs text-slate-600 flex items-center gap-1">
                                                            <Factory className="w-3 h-3 text-orange-500/60" />{row.supplierName}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Qty grid */}
                                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-x-4 gap-y-1 mt-2">
                                                    {[
                                                        { label: 'Ordered/Mo', val: row.qtyOrderedThisMonth, color: 'text-indigo-400' },
                                                        { label: 'Rcvd Total', val: row.qtyReceivedTillNow, color: 'text-slate-300' },
                                                        { label: 'Demand', val: row.customerRequiredQty, color: row.customerRequiredQty > row.totalProcured ? 'text-amber-400' : 'text-sky-400' },
                                                        { label: 'Sent', val: row.totalProcured, color: 'text-blue-400' },
                                                        { label: 'At Vendors', val: row.balanceAtVendors, color: row.balanceAtVendors > 0 ? 'text-amber-400' : 'text-slate-600' },
                                                        { label: 'Rejected', val: row.totalRejected, color: row.totalRejected > 0 ? 'text-red-400' : 'text-slate-600' },
                                                        { label: 'Ready', val: row.readyForDispatch, color: row.readyForDispatch > 0 ? 'text-violet-400' : 'text-slate-600' },
                                                        { label: 'Rcvd/Supplier', val: row.receivedFromSupplier || 0, color: (row.receivedFromSupplier || 0) > 0 ? 'text-orange-400' : 'text-slate-600' },
                                                        { label: 'Store Bal', val: row.storeBalance || 0, color: (row.storeBalance || 0) > 0 ? 'text-teal-400' : 'text-slate-600' },
                                                        { label: 'Pend.Supplier', val: row.pendingFromSupplier || 0, color: (row.pendingFromSupplier || 0) > 0 ? 'text-pink-400' : 'text-slate-600' },
                                                    ].map(c => (
                                                        <div key={c.label}>
                                                            <p className="text-slate-600 text-xs leading-none">{c.label}</p>
                                                            <p className={`font-semibold text-sm ${c.color}`}>{c.val || '—'}</p>
                                                        </div>
                                                    ))}
                                                    {/* Dispatch target — editable */}
                                                    <div>
                                                        <p className="text-slate-600 text-xs leading-none">Target ✎</p>
                                                        <TargetCell partNumber={row.partNumber} value={row.dispatchTarget} onSaved={v => updTarget(row.partNumber, v)} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expand icon */}
                                            <div className="flex-shrink-0 pt-0.5">
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-800 px-4 py-4 bg-slate-900/60 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                                    Process Sequences ({row.operations.length})
                                                </p>
                                                <OpsPanel ops={row.operations} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                                    Vendor Balance
                                                </p>
                                                {row.vendorBreakdown.length === 0 ? (
                                                    <p className="text-xs text-slate-700 italic">No material currently at vendors</p>
                                                ) : row.vendorBreakdown.map(v => (
                                                    <div key={v.vendorId} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 text-xs mb-1.5">
                                                        <div>
                                                            <span className="text-white font-medium">{v.vendorName}</span>
                                                            <span className="text-slate-600 ml-1">({v.vendorCode})</span>
                                                            {v.currentStage && <span className="ml-2 text-blue-400">[{v.currentStage}]</span>}
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <span className="text-amber-400 font-medium">{v.balance} pcs</span>
                                                            {v.wip > 0 && <span className="text-slate-500">WIP: {v.wip}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {row.lastChallanDate && (
                                                    <p className="text-xs text-slate-600 mt-2">
                                                        Last challan: {new Date(row.lastChallanDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
