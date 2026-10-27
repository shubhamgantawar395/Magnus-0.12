'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api-client';
import {
    Search, Loader2, CheckCircle2, Clock, AlertTriangle,
    Truck, ChevronRight, ArrowLeft, History, X, RefreshCw,
    Package, AlertCircle, CalendarClock,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

type ProcessStatus = 'pending' | 'in_progress' | 'completed';

interface ProcessUpdate {
    id: string;
    quantityCompleted: number;
    quantityRejected: number;
    quantityRework: number;
    remarks: string | null;
    createdAt: string;
    updatedBy: { firstName: string; lastName: string } | null;
}

interface JobProcess {
    id: string;
    processName: string;
    processSequence: number | null;
    status: ProcessStatus;
    targetQuantity: number;
    completedQuantity: number;
    rejectedQuantity: number;
    reworkQuantity: number;
    startedAt: string | null;
    completedAt: string | null;
}

interface ChallanItem {
    id: string;
    partNumber: string;
    partDescription: string | null;
    quantityIssued: number;
    unitOfMeasure: string | null;
    deadlineNote: string | null;
    executiveDeadline: string | null;
    jobProcesses: JobProcess[];
}

interface Challan {
    id: string;
    challanNumber: string;
    challanDate: string;
    customer: { companyName: string };
    items: ChallanItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function challanStatus(ch: Challan): 'pending' | 'in_progress' | 'completed' | 'dispatch_ready' {
    const allProcesses = ch.items.flatMap(i => i.jobProcesses);
    if (allProcesses.length === 0) return 'pending';
    if (allProcesses.every(p => p.status === 'completed')) return 'dispatch_ready';
    if (allProcesses.some(p => p.status === 'in_progress')) return 'in_progress';
    return 'pending';
}

function isOverdue(deadline: string | null) {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
}

function daysUntil(deadline: string | null) {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    return diff;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReturnType<typeof challanStatus> }) {
    const map = {
        pending: 'bg-slate-700/40 text-slate-400 border-slate-700',
        in_progress: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dispatch_ready: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    };
    const label = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
        dispatch_ready: '✓ Dispatch Ready',
    };
    return (
        <span className={`text-xs border px-2.5 py-0.5 rounded-full font-medium ${map[status]}`}>
            {label[status]}
        </span>
    );
}

// ── Process step button ───────────────────────────────────────────────────────

function ProcessStep({
    process,
    isActive,
    onUpdate,
    onHistory,
}: {
    process: JobProcess;
    isActive: boolean;
    onUpdate: (p: JobProcess) => void;
    onHistory: (processId: string, processName: string) => void;
}) {
    const pct = process.targetQuantity > 0
        ? Math.min(100, (process.completedQuantity / process.targetQuantity) * 100)
        : 0;

    const statusStyle = process.status === 'completed'
        ? 'border-emerald-600/50 bg-emerald-950/20'
        : process.status === 'in_progress'
            ? 'border-cyan-600/50 bg-cyan-950/20 ring-1 ring-cyan-500/20'
            : 'border-slate-700/50 bg-slate-900/40';

    return (
        <div className={`relative border rounded-xl p-3 min-w-[140px] flex-shrink-0 ${statusStyle}`}>
            {/* Status icon */}
            <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-xs font-semibold text-slate-300 truncate">{process.processName}</span>
                {process.status === 'completed'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    : process.status === 'in_progress'
                        ? <Clock className="w-4 h-4 text-cyan-400 flex-shrink-0 animate-pulse" />
                        : <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex-shrink-0" />
                }
            </div>

            {/* Progress */}
            <div className="text-xs text-slate-500 mb-1.5">
                <span className={process.status === 'completed' ? 'text-emerald-400' : 'text-white'}>
                    {process.completedQuantity}
                </span>
                <span className="mx-0.5">/</span>
                <span>{process.targetQuantity}</span>
                {process.rejectedQuantity > 0 && (
                    <span className="ml-1 text-red-400">(-{process.rejectedQuantity})</span>
                )}
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 mb-2">
                <div
                    className={`h-1 rounded-full transition-all ${process.status === 'completed' ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-1">
                {process.status !== 'completed' && (
                    <button
                        onClick={() => onUpdate(process)}
                        className="flex-1 text-xs py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-600/30 transition-colors"
                    >
                        Update
                    </button>
                )}
                <button
                    onClick={() => onHistory(process.id, process.processName)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors"
                    title="View history"
                >
                    <History className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'all' | 'pending' | 'in_progress' | 'dispatch_ready';

export default function MyJobsPage() {
    const [challans, setChallans] = useState<Challan[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [tab, setTab] = useState<Tab>('all');

    // Update panel state
    const [updatePanel, setUpdatePanel] = useState<{
        open: boolean;
        process: JobProcess | null;
        partNumber: string;
        challanNumber: string;
    }>({ open: false, process: null, partNumber: '', challanNumber: '' });
    const [updateForm, setUpdateForm] = useState({ completed: 0, rejected: 0, rework: 0, remarks: '' });
    const [submitting, setSubmitting] = useState(false);

    // History panel state
    const [historyPanel, setHistoryPanel] = useState<{
        open: boolean;
        processId: string;
        processName: string;
        updates: ProcessUpdate[];
        loading: boolean;
    }>({ open: false, processId: '', processName: '', updates: [], loading: false });

    const fetchJobs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await apiClient.get('/vendors/jobs');
            setChallans(res.data.data || []);
        } catch {
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    // ── Filtering — memoized so it only recomputes when challans/tab/search change

    const filtered = useMemo(() => challans.filter(ch => {
        const st = challanStatus(ch);

        // Tab filter
        if (tab === 'pending' && st !== 'pending') return false;
        if (tab === 'in_progress' && st !== 'in_progress') return false;
        if (tab === 'dispatch_ready' && st !== 'dispatch_ready') return false;

        // Search (debounced)
        if (debouncedSearch) {
            const s = debouncedSearch.toLowerCase();
            const matchesChallan = ch.challanNumber.toLowerCase().includes(s);
            const matchesPart = ch.items.some(i =>
                i.partNumber.toLowerCase().includes(s) ||
                (i.partDescription || '').toLowerCase().includes(s)
            );
            if (!matchesChallan && !matchesPart) return false;
        }
        return true;
    }), [challans, tab, debouncedSearch]);

    // ── KPI counts — single-pass memoization ───────────────────────────────────

    const { counts, totalCompleted } = useMemo(() => {
        let pending = 0, in_progress = 0, dispatch_ready = 0, completed = 0;
        for (const c of challans) {
            const st = challanStatus(c);
            if (st === 'pending') pending++;
            else if (st === 'in_progress') in_progress++;
            else if (st === 'dispatch_ready') dispatch_ready++;
            for (const i of c.items)
                for (const p of i.jobProcesses)
                    completed += p.completedQuantity;
        }
        return {
            counts: { all: challans.length, pending, in_progress, dispatch_ready },
            totalCompleted: completed,
        };
    }, [challans]);

    // ── Process update ─────────────────────────────────────────────────────────

    const openUpdatePanel = (process: JobProcess, partNumber: string, challanNumber: string) => {
        setUpdatePanel({ open: true, process, partNumber, challanNumber });
        setUpdateForm({ completed: 0, rejected: 0, rework: 0, remarks: '' });
    };

    const handleSubmitUpdate = async () => {
        if (!updatePanel.process) return;
        const p = updatePanel.process;
        const remaining = p.targetQuantity - p.completedQuantity;
        const total = updateForm.completed + updateForm.rejected + updateForm.rework;

        if (total === 0) { toast.error('Enter at least one quantity'); return; }
        if (total > remaining) {
            toast.error(`Total ${total} exceeds remaining ${remaining} pcs`); return;
        }

        setSubmitting(true);
        try {
            await apiClient.post(`/jobs/processes/${p.id}/update`, {
                quantityCompleted: updateForm.completed,
                quantityRejected: updateForm.rejected,
                quantityRework: updateForm.rework,
                remarks: updateForm.remarks || undefined,
            });
            toast.success('Process updated');
            setUpdatePanel(prev => ({ ...prev, open: false }));
            fetchJobs(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Update failed');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Process history ────────────────────────────────────────────────────────

    const openHistory = async (processId: string, processName: string) => {
        setHistoryPanel({ open: true, processId, processName, updates: [], loading: true });
        try {
            const res = await apiClient.get(`/jobs/processes/${processId}/history`);
            setHistoryPanel(prev => ({ ...prev, updates: res.data || [], loading: false }));
        } catch {
            toast.error('Failed to load history');
            setHistoryPanel(prev => ({ ...prev, loading: false }));
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-slate-500 text-sm">Loading your jobs…</p>
                </div>
            </div>
        );
    }

    const remaining = updatePanel.process
        ? updatePanel.process.targetQuantity - updatePanel.process.completedQuantity
        : 0;
    const updateTotal = updateForm.completed + updateForm.rejected + updateForm.rework;

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/vendor" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Package className="w-6 h-6 text-indigo-400" />
                                My Jobs
                            </h1>
                            <p className="text-slate-500 text-sm">Track and update all assigned job processes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchJobs(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-sm transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'All Jobs', value: counts.all, color: 'text-white', tab: 'all' as Tab },
                        { label: 'Pending', value: counts.pending, color: 'text-slate-400', tab: 'pending' as Tab },
                        { label: 'In Progress', value: counts.in_progress, color: 'text-cyan-400', tab: 'in_progress' as Tab },
                        { label: 'Dispatch Ready', value: counts.dispatch_ready, color: 'text-violet-400', tab: 'dispatch_ready' as Tab },
                    ].map(card => (
                        <button
                            key={card.tab}
                            onClick={() => setTab(card.tab)}
                            className={`text-left p-4 rounded-xl border transition-all ${tab === card.tab
                                ? 'bg-indigo-600/10 border-indigo-500/40'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                }`}
                        >
                            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
                            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search by part number, description, or challan…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                </div>

                {/* Jobs list */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-semibold mb-1">No jobs found</p>
                        <p className="text-slate-600 text-sm">
                            {tab !== 'all' ? 'Try switching to "All Jobs" or clear your search.' : 'Jobs will appear here when delivery challans are issued to you.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-slate-600 text-sm">
                            Showing <span className="text-slate-400 font-medium">{filtered.length}</span> challan{filtered.length !== 1 ? 's' : ''}
                            {totalCompleted > 0 && <> · <span className="text-emerald-400 font-medium">{totalCompleted.toLocaleString()} pcs</span> completed total</>}
                        </p>

                        {filtered.map(challan => {
                            const st = challanStatus(challan);
                            const hasDeadline = challan.items.some(i => i.executiveDeadline);
                            const nearestDeadline = challan.items
                                .map(i => i.executiveDeadline)
                                .filter(Boolean)
                                .sort()[0] ?? null;
                            const days = daysUntil(nearestDeadline);
                            const overdue = isOverdue(nearestDeadline);

                            return (
                                <div key={challan.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                                    {/* Challan header */}
                                    <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-800/40 flex-wrap">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="font-mono text-indigo-400 font-semibold">{challan.challanNumber}</span>
                                            <span className="text-slate-500 text-xs">
                                                {new Date(challan.challanDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                            </span>
                                            <span className="text-slate-600 text-xs">from {challan.customer.companyName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {nearestDeadline && (
                                                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${overdue
                                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                    : days !== null && days <= 3
                                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                                    }`}>
                                                    <CalendarClock className="w-3 h-3" />
                                                    {overdue ? 'Overdue' : days === 0 ? 'Due today' : `${days}d left`}
                                                </span>
                                            )}
                                            <StatusBadge status={st} />
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="divide-y divide-slate-800/60">
                                        {challan.items.map(item => {
                                            const totalCompleted = item.jobProcesses.reduce((s, p) => s + p.completedQuantity, 0);
                                            const totalRejected = item.jobProcesses.reduce((s, p) => s + p.rejectedQuantity, 0);
                                            const pct = item.quantityIssued > 0
                                                ? Math.min(100, (totalCompleted / item.quantityIssued) * 100)
                                                : 0;

                                            return (
                                                <div key={item.id} className="p-5">
                                                    {/* Part header */}
                                                    <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-semibold text-white">{item.partNumber}</span>
                                                                {item.deadlineNote && (
                                                                    <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                                                                        {item.deadlineNote}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.partDescription && (
                                                                <p className="text-sm text-slate-500 mt-0.5">{item.partDescription}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-right text-sm">
                                                            <div className="text-white font-medium">{item.quantityIssued} {item.unitOfMeasure || 'NOS'} issued</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                <span className="text-emerald-400">{totalCompleted} done</span>
                                                                {totalRejected > 0 && <> · <span className="text-red-400">{totalRejected} rejected</span></>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Overall progress bar */}
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                                            <div
                                                                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-slate-500 w-8 text-right">{Math.round(pct)}%</span>
                                                    </div>

                                                    {/* Process flow */}
                                                    {item.jobProcesses.length === 0 ? (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-800/40 rounded-lg px-4 py-3">
                                                            <AlertCircle className="w-4 h-4" />
                                                            No job processes defined for this part yet.
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-start gap-2 overflow-x-auto pb-1">
                                                            {item.jobProcesses
                                                                .slice()
                                                                .sort((a, b) => (a.processSequence ?? 0) - (b.processSequence ?? 0))
                                                                .map((process, idx, arr) => (
                                                                    <div key={process.id} className="flex items-start gap-2 flex-shrink-0">
                                                                        <ProcessStep
                                                                            process={process}
                                                                            isActive={process.status === 'in_progress'}
                                                                            onUpdate={p => openUpdatePanel(p, item.partNumber, challan.challanNumber)}
                                                                            onHistory={openHistory}
                                                                        />
                                                                        {idx < arr.length - 1 && (
                                                                            <ChevronRight className="w-4 h-4 text-slate-700 mt-5 flex-shrink-0" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Update Process Panel (right slide-in) ──────────────────────── */}
            {updatePanel.open && updatePanel.process && (
                <div className="fixed inset-0 z-50 flex">
                    <div
                        className="flex-1 bg-black/50 backdrop-blur-sm"
                        onClick={() => setUpdatePanel(p => ({ ...p, open: false }))}
                    />
                    <div className="w-full max-w-sm bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl shadow-black/60 overflow-y-auto">
                        {/* Panel header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <p className="font-semibold text-white">Update Process</p>
                                <p className="text-xs text-slate-500 mt-0.5 font-mono">{updatePanel.challanNumber} · {updatePanel.partNumber}</p>
                            </div>
                            <button
                                onClick={() => setUpdatePanel(p => ({ ...p, open: false }))}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Process info */}
                        <div className="p-5 space-y-5 flex-1">
                            <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Process</span>
                                    <span className="text-sm font-semibold text-white">{updatePanel.process.processName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Target</span>
                                    <span className="text-sm text-white">{updatePanel.process.targetQuantity} pcs</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-slate-400">Completed so far</span>
                                    <span className="text-sm text-emerald-400">{updatePanel.process.completedQuantity} pcs</span>
                                </div>
                                {updatePanel.process.rejectedQuantity > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-slate-400">Rejected so far</span>
                                        <span className="text-sm text-red-400">{updatePanel.process.rejectedQuantity} pcs</span>
                                    </div>
                                )}
                                <div className="border-t border-slate-700 pt-2 flex justify-between">
                                    <span className="text-sm font-semibold text-slate-300">Remaining</span>
                                    <span className="text-sm font-bold text-amber-400">{remaining} pcs</span>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-3">
                                {[
                                    { key: 'completed' as const, label: 'Qty Completed', color: 'focus:border-emerald-500', hint: 'Parts fully finished' },
                                    { key: 'rejected' as const, label: 'Qty Rejected', color: 'focus:border-red-500', hint: 'Failed quality check' },
                                    { key: 'rework' as const, label: 'Qty for Rework', color: 'focus:border-amber-500', hint: 'Needs re-processing' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">{f.label}</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={remaining}
                                            value={updateForm[f.key]}
                                            onChange={e => setUpdateForm(prev => ({ ...prev, [f.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors ${f.color}`}
                                        />
                                        <p className="text-xs text-slate-600 mt-0.5">{f.hint}</p>
                                    </div>
                                ))}

                                {/* Running total */}
                                {updateTotal > 0 && (
                                    <div className={`flex justify-between text-xs px-3 py-2 rounded-lg ${updateTotal > remaining
                                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                                        : 'bg-slate-800 text-slate-400'
                                        }`}>
                                        <span>Total entered</span>
                                        <span className="font-semibold">{updateTotal} / {remaining} remaining</span>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Remarks (optional)</label>
                                    <textarea
                                        value={updateForm.remarks}
                                        onChange={e => setUpdateForm(prev => ({ ...prev, remarks: e.target.value }))}
                                        rows={3}
                                        placeholder="Machine issues, quality notes…"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-indigo-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Panel footer */}
                        <div className="p-5 border-t border-slate-800">
                            <button
                                onClick={handleSubmitUpdate}
                                disabled={submitting || updateTotal === 0 || updateTotal > remaining}
                                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {submitting ? 'Saving…' : 'Submit Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Process History Panel ──────────────────────────────────────── */}
            {historyPanel.open && (
                <div className="fixed inset-0 z-50 flex">
                    <div
                        className="flex-1 bg-black/50 backdrop-blur-sm"
                        onClick={() => setHistoryPanel(p => ({ ...p, open: false }))}
                    />
                    <div className="w-full max-w-sm bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <p className="font-semibold text-white">Update History</p>
                                <p className="text-xs text-slate-500 mt-0.5">{historyPanel.processName}</p>
                            </div>
                            <button
                                onClick={() => setHistoryPanel(p => ({ ...p, open: false }))}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 flex-1">
                            {historyPanel.loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                </div>
                            ) : historyPanel.updates.length === 0 ? (
                                <div className="text-center py-10 text-slate-600">
                                    <History className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm">No updates logged yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyPanel.updates.map((u, i) => (
                                        <div key={u.id} className="bg-slate-800/50 rounded-xl p-3 border border-slate-800">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <div className="flex gap-3 text-sm">
                                                    {u.quantityCompleted > 0 && (
                                                        <span className="text-emerald-400 font-medium">+{u.quantityCompleted} done</span>
                                                    )}
                                                    {u.quantityRejected > 0 && (
                                                        <span className="text-red-400">-{u.quantityRejected} rej.</span>
                                                    )}
                                                    {u.quantityRework > 0 && (
                                                        <span className="text-amber-400">{u.quantityRework} rework</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-600 flex-shrink-0">
                                                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    {' '}
                                                    {new Date(u.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {u.remarks && (
                                                <p className="text-xs text-slate-500 italic">"{u.remarks}"</p>
                                            )}
                                            {u.updatedBy && (
                                                <p className="text-xs text-slate-700 mt-1">
                                                    by {u.updatedBy.firstName} {u.updatedBy.lastName}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
