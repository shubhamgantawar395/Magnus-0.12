'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Search,
    Filter,
    Package,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Truck,
    Activity,
    Loader2,
    ArrowLeft,
    Circle,
    ChevronDown,
    ChevronUp,
    CalendarClock,
    Pencil,
    Save,
    X
} from 'lucide-react';
import { Suspense } from 'react';
import {
    executiveService,
    type TrackedPart,
    type ProcessStep
} from '@/services/executive.service';
import toast from 'react-hot-toast';

const STAGE_CONFIG = {
    raw: { label: 'Raw Material', color: 'text-slate-400', bg: 'bg-slate-500/10', dot: 'bg-slate-500' },
    wip: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
    finished: { label: 'Ready to Dispatch', color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    dispatched: { label: 'Dispatched', color: 'text-violet-400', bg: 'bg-violet-500/10', dot: 'bg-violet-500' },
};

const HEALTH_CONFIG = {
    overdue: { label: 'Overdue', icon: AlertTriangle, badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
    at_risk: { label: 'At Risk', icon: Clock, badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    on_track: { label: 'On Track', icon: CheckCircle2, badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    no_deadline: { label: 'No Deadline', icon: Circle, badge: 'bg-slate-500/15 text-slate-500 border-slate-500/20' },
};

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'overdue', label: '🔴 Overdue' },
    { value: 'at_risk', label: '🟡 At Risk' },
    { value: 'on_track', label: '🟢 On Track' },
    { value: 'wip', label: '🔵 In Progress' },
    { value: 'finished', label: '✅ Ready to Dispatch' },
    { value: 'raw', label: '⚪ Raw Material' },
    { value: 'dispatched', label: '🚀 Dispatched' },
];

function PipelineStep({ step, isLast }: { step: ProcessStep; isLast: boolean }) {
    const statusStyle =
        step.status === 'completed' ? 'bg-emerald-500 text-white border-emerald-400' :
            step.status === 'in_progress' ? 'bg-blue-500 text-white border-blue-400 ring-2 ring-blue-500/30' :
                step.status === 'rejected' ? 'bg-red-500 text-white border-red-400' :
                    'bg-slate-800 text-slate-500 border-slate-700';

    const pct = step.target ? Math.round((step.completed / step.target) * 100) : 0;

    return (
        <div className="flex items-start gap-2">
            <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${statusStyle}`}>
                    {step.sequence ?? '?'}
                </div>
                {!isLast && <div className="w-px h-full min-h-[20px] bg-slate-700 mt-1" />}
            </div>
            <div className="pb-4">
                <p className="text-sm font-semibold text-white">{step.name}</p>
                {step.target !== null && (
                    <>
                        <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                            <span>✓ {step.completed}</span>
                            {step.rejected > 0 && <span className="text-red-400">✗ {step.rejected}</span>}
                            {step.rework > 0 && <span className="text-amber-400">↺ {step.rework}</span>}
                            <span className="text-slate-600">/ {step.target}</span>
                        </div>
                        {step.status === 'in_progress' && (
                            <div className="mt-1 h-1 w-28 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function PartCard({ part, onDeadlineSet }: { part: TrackedPart; onDeadlineSet: (id: string, deadline: string, note: string) => void }) {
    const [expanded, setExpanded] = useState(false);
    const [editingDeadline, setEditingDeadline] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState(
        part.deadline ? new Date(part.deadline).toISOString().split('T')[0] : ''
    );
    const [deadlineNote, setDeadlineNote] = useState(part.deadlineNote || '');
    const [savingDeadline, setSavingDeadline] = useState(false);
    const stage = STAGE_CONFIG[part.stage];
    const health = HEALTH_CONFIG[part.scheduleHealth];
    const HealthIcon = health.icon;

    const handleSaveDeadline = async () => {
        if (!deadlineDate) return;
        setSavingDeadline(true);
        try {
            await executiveService.setPartDeadline(part.id, { deadline: deadlineDate, note: deadlineNote || undefined });
            onDeadlineSet(part.id, deadlineDate, deadlineNote);
            setEditingDeadline(false);
            toast.success(`Deadline set for ${part.partNumber}`);
        } catch {
            toast.error('Failed to set deadline');
        } finally {
            setSavingDeadline(false);
        }
    };

    const dispatchPct = part.quantityIssued > 0
        ? Math.round((part.quantityDispatched / part.quantityIssued) * 100)
        : 0;

    const activeStep = part.pipeline.find(p => p.status === 'in_progress');
    const completedSteps = part.pipeline.filter(p => p.status === 'completed').length;
    const totalSteps = part.pipeline.length;

    return (
        <Card className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-200">
            {/* Card Header */}
            <div
                className="p-5 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono font-bold text-white text-lg">{part.partNumber}</span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${health.badge}`}>
                                <HealthIcon className="w-3 h-3" />
                                {health.label}
                                {part.daysRemaining !== null && (
                                    <span className="font-mono">
                                        {part.daysRemaining < 0 ? `(${Math.abs(part.daysRemaining)}d late)` : `(${part.daysRemaining}d)`}
                                    </span>
                                )}
                            </span>
                        </div>
                        {part.partDescription && (
                            <p className="text-slate-400 text-sm truncate">{part.partDescription}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1"><Package className="w-3 h-3" />{part.customer.companyName}</span>
                            <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{part.vendor.companyName} ({part.vendor.vendorCode})</span>
                            <span className="text-slate-600">#{part.challanNumber}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${stage.bg} ${stage.color}`}>
                            <Circle className="w-2 h-2 fill-current" />
                            {stage.label}
                        </span>
                        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center">
                        <p className="text-white font-bold">{part.quantityIssued}</p>
                        <p className="text-slate-500 text-xs">Issued</p>
                    </div>
                    <div className="text-center">
                        <p className="text-emerald-400 font-bold">{part.quantityDispatched}</p>
                        <p className="text-slate-500 text-xs">Dispatched</p>
                    </div>
                    <div className="text-center">
                        <p className="text-blue-400 font-bold">{totalSteps > 0 ? `${completedSteps}/${totalSteps}` : '—'}</p>
                        <p className="text-slate-500 text-xs">Processes</p>
                    </div>
                </div>

                {/* Progress bar */}
                {totalSteps > 0 && (
                    <div className="mt-3">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                            />
                        </div>
                        {activeStep && (
                            <p className="text-xs text-blue-400 mt-1">
                                Currently: <span className="font-medium">{activeStep.name}</span>
                                {activeStep.target && ` — ${activeStep.completed}/${activeStep.target} done`}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded Pipeline */}
            {expanded && (
                <div className="border-t border-slate-800 px-5 py-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Process Pipeline</h4>
                    {part.pipeline.length === 0 ? (
                        <p className="text-slate-600 text-sm italic">No job processes defined for this part yet.</p>
                    ) : (
                        <div className="pl-1">
                            {part.pipeline.map((step, i) => (
                                <PipelineStep key={step.id} step={step} isLast={i === part.pipeline.length - 1} />
                            ))}
                        </div>
                    )}

                    {/* Deadline section */}
                    <div className="mt-3 pt-3 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivery Deadline</span>
                            {!editingDeadline && (
                                <button
                                    onClick={() => setEditingDeadline(true)}
                                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                                >
                                    <Pencil className="w-3 h-3" /> Set Deadline
                                </button>
                            )}
                        </div>

                        {editingDeadline ? (
                            <div className="space-y-2">
                                <input
                                    type="date"
                                    value={deadlineDate}
                                    onChange={e => setDeadlineDate(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <input
                                    type="text"
                                    value={deadlineNote}
                                    onChange={e => setDeadlineNote(e.target.value)}
                                    placeholder="Optional note (e.g. Tata Q2 commitment)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveDeadline}
                                        disabled={savingDeadline || !deadlineDate}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                                    >
                                        {savingDeadline ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingDeadline(false)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                                    >
                                        <X className="w-3 h-3" /> Cancel
                                    </button>
                                </div>
                            </div>
                        ) : part.deadline ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                                    <span className={`font-medium text-sm ${
                                        part.scheduleHealth === 'overdue' ? 'text-red-400' :
                                        part.scheduleHealth === 'at_risk' ? 'text-amber-400' : 'text-slate-300'
                                    }`}>
                                        {new Date(part.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                        part.deadlineSource === 'executive'
                                            ? 'bg-indigo-500/15 text-indigo-400'
                                            : 'bg-slate-700 text-slate-400'
                                    }`}>
                                        {part.deadlineSource === 'executive' ? 'Executive' : 'From PO'}
                                    </span>
                                </div>
                                {part.deadlineNote && (
                                    <p className="text-xs text-slate-600 pl-5 italic">{part.deadlineNote}</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-slate-600 text-xs italic">No deadline set. Click 'Set Deadline' to add one.</p>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

function PartsTrackerContent() {
    const searchParams = useSearchParams();
    const preCustomerId = searchParams.get('customerId') || '';
    const preStatus = searchParams.get('status') || '';

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(preStatus);
    const [customerFilter, setCustomerFilter] = useState(preCustomerId);
    const [parts, setParts] = useState<TrackedPart[]>([]);
    const [summary, setSummary] = useState<{ total: number; byStage: Record<string, number> } | null>(null);
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

    const fetchParts = useCallback(async (partNum?: string) => {
        setLoading(true);
        try {
            const res = await executiveService.getPartTracker({
                partNumber: partNum,
                customerId: customerFilter || undefined,
                status: statusFilter as any || undefined,
            });
            setParts(res.data);
            setSummary(res.summary);

            // Extract unique customers for filter dropdown
            const seen = new Map<string, string>();
            res.data.forEach(p => seen.set(p.customer.id, p.customer.companyName));
            // Also pre-populate from full list if no filter
            if (!customerFilter && !statusFilter && !partNum) {
                setCustomers(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [customerFilter, statusFilter]);

    useEffect(() => {
        fetchParts();
    }, [fetchParts]);

    // Debounced part number search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2 || searchQuery.length === 0) {
                fetchParts(searchQuery || undefined);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Optimistic update after deadline is set
    const handleDeadlineSet = useCallback((id: string, deadline: string, note: string) => {
        setParts(prev => prev.map(p => p.id === id
            ? { ...p, deadline, deadlineNote: note, deadlineSource: 'executive' as const }
            : p
        ));
    }, []);

    const byStage = summary?.byStage ?? { raw: 0, wip: 0, finished: 0, dispatched: 0 };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8 space-y-6">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/executive" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Search className="w-6 h-6 text-indigo-400" />
                                Part Tracker
                            </h1>
                            <p className="text-slate-500 text-sm">Search and monitor any part across all customers and vendors</p>
                        </div>
                    </div>
                </div>

                {/* Stage summary strip */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { key: 'raw', label: 'Raw Material', icon: Package, color: 'text-slate-400', bg: 'bg-slate-800/50' },
                        { key: 'wip', label: 'In Progress', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-950/40' },
                        { key: 'finished', label: 'Ready to Dispatch', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/40' },
                        { key: 'dispatched', label: 'Dispatched', icon: Truck, color: 'text-violet-400', bg: 'bg-violet-950/40' },
                    ].map(s => (
                        <button
                            key={s.key}
                            onClick={() => setStatusFilter(statusFilter === s.key ? '' : s.key)}
                            className={`${s.bg} ${statusFilter === s.key ? 'ring-2 ring-indigo-500' : ''} rounded-xl p-3 text-center cursor-pointer transition-all hover:ring-1 hover:ring-slate-600`}
                        >
                            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                            <p className={`text-xl font-bold ${s.color}`}>{(byStage as any)[s.key] ?? 0}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                        </button>
                    ))}
                </div>

                {/* Search & Filters */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by part number (e.g. ABC-101)..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <select
                            value={customerFilter}
                            onChange={e => setCustomerFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-w-[180px]"
                        >
                            <option value="">All Customers</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-w-[160px]"
                        >
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        {(searchQuery || customerFilter || statusFilter) && (
                            <button
                                onClick={() => { setSearchQuery(''); setCustomerFilter(''); setStatusFilter(''); }}
                                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                            <p className="text-slate-500 text-sm">Loading parts...</p>
                        </div>
                    </div>
                ) : parts.length === 0 ? (
                    <div className="text-center py-20">
                        <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <h3 className="text-slate-400 font-semibold mb-1">No parts found</h3>
                        <p className="text-slate-600 text-sm">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        <p className="text-slate-500 text-sm mb-4">
                            Showing <span className="text-white font-medium">{parts.length}</span> part{parts.length !== 1 ? 's' : ''}
                            {summary && summary.total > parts.length && ` (of ${summary.total})`}
                        </p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {parts.map(part => (
                                <PartCard key={part.id} part={part} onDeadlineSet={handleDeadlineSet} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function PartsTracker() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-slate-500 text-sm">Loading tracker...</p>
                </div>
            </div>
        }>
            <PartsTrackerContent />
        </Suspense>
    );
}
