'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    Target, ChevronDown, ChevronRight, Loader2, RefreshCw,
    Plus, Save, Calendar, TrendingUp, Truck, Wrench, AlertTriangle,
    CheckCircle2, X, ClipboardList, Check, PackageCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineDeadlineRow {
    customerId: string;
    partNumber: string;
    partName: string;
    month: number;
    year: number;
    monthlyTarget: number;
    week1Target: number;
    week2Target: number;
    week3Target: number;
    week4Target: number;
    readyForDispatch: number;
    dispatched: number;
    wip: number;
    balance: number;
    notes: string | null;
}

interface LineGroup {
    customerId: string;
    lineName: string;
    customerCode: string;
    rows: LineDeadlineRow[];
    totals: {
        monthlyTarget: number;
        week1Target: number;
        week2Target: number;
        week3Target: number;
        week4Target: number;
        readyForDispatch: number;
        dispatched: number;
        wip: number;
        balance: number;
    };
}

interface MonthData {
    month: number;
    year: number;
    lines: LineGroup[];
    grandTotals: {
        monthlyTarget: number;
        dispatched: number;
        wip: number;
        readyForDispatch: number;
        balance: number;
    };
}

type EditableField = 'monthlyTarget' | 'week1Target' | 'week2Target' | 'week3Target' | 'week4Target' | 'readyForDispatch';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pct(dispatched: number, target: number): number {
    if (!target) return 0;
    return Math.min(100, Math.round((dispatched / target) * 100));
}

function progressBarColor(p: number, balance: number): string {
    if (balance === 0 && p >= 100) return 'bg-emerald-500';
    if (p >= 75) return 'bg-teal-400';
    if (p >= 40) return 'bg-amber-400';
    return 'bg-red-400';
}

// ─── Editable cell ────────────────────────────────────────────────────────────

interface EditableCellProps {
    value: number;
    onChange: (v: number) => void;
    onBlurSave: () => void;
    colorClass?: string;
    isLoading?: boolean;
}

function EditableCell({ value, onChange, onBlurSave, colorClass = 'text-white', isLoading }: EditableCellProps) {
    const [editing, setEditing] = useState(false);
    const [local, setLocal] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (!editing) setLocal(String(value)); }, [value, editing]);

    function startEdit() {
        if (isLoading) return;
        setEditing(true);
        setTimeout(() => inputRef.current?.select(), 10);
    }
    function commit() {
        const n = parseInt(local, 10);
        if (!isNaN(n) && n >= 0) onChange(n);
        else setLocal(String(value));
        setEditing(false);
        onBlurSave();
    }
    function cancel() { setLocal(String(value)); setEditing(false); }

    if (isLoading) {
        return <span className="flex justify-end"><Loader2 size={12} className="animate-spin text-slate-500" /></span>;
    }

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="number"
                min={0}
                className="w-20 bg-slate-700 border border-blue-500 rounded px-2 py-0.5 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={local}
                onChange={e => setLocal(e.target.value)}
                onBlur={commit}
                onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
                autoFocus
            />
        );
    }
    return (
        <button
            onClick={startEdit}
            title="Click to edit"
            className={`group flex items-center justify-end gap-1 w-full text-sm font-medium transition-colors cursor-pointer hover:opacity-80 ${colorClass}`}
        >
            {value > 0
                ? <span>{value.toLocaleString()}</span>
                : <span className="text-slate-600">—</span>
            }
            <span className="opacity-0 group-hover:opacity-50 text-xs text-slate-400 flex-shrink-0">✎</span>
        </button>
    );
}

// ─── Mini Progress Bar ─────────────────────────────────────────────────────────

function MiniProgress({ dispatched, target }: { dispatched: number; target: number }) {
    const p = pct(dispatched, target);
    const balance = Math.max(0, target - dispatched);
    if (!target) return <span className="text-slate-600 text-xs">—</span>;
    return (
        <div className="flex items-center gap-1.5 justify-center">
            <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-shrink-0">
                <div
                    className={`h-full rounded-full transition-all duration-300 ${progressBarColor(p, balance)}`}
                    style={{ width: `${p}%` }}
                />
            </div>
            <span className={`text-xs font-medium w-8 text-right ${p >= 100 ? 'text-emerald-400' : p >= 60 ? 'text-amber-400' : 'text-slate-400'}`}>{p}%</span>
        </div>
    );
}

// ─── Balance Badge ──────────────────────────────────────────────────────────

function BalanceBadge({ balance, target }: { balance: number; target: number }) {
    if (!target) return <span className="text-slate-600 text-xs">—</span>;
    if (balance === 0) return (
        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
            <Check size={11} />Done
        </span>
    );
    const urgent = balance > target * 0.5;
    return (
        <span className={`text-xs font-semibold ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
            {balance.toLocaleString()}
        </span>
    );
}

// ─── Add Part Dialog ──────────────────────────────────────────────────────────

interface AddPartDialogProps {
    customerId: string;
    lineName: string;
    month: number;
    year: number;
    onAdd: () => void;
    onClose: () => void;
}

function AddPartDialog({ customerId, lineName, month, year, onAdd, onClose }: AddPartDialogProps) {
    const [partNumber, setPartNumber] = useState('');
    const [saving, setSaving] = useState(false);

    async function submit() {
        if (!partNumber.trim()) return;
        setSaving(true);
        try {
            await apiClient.post('/line-deadlines/add-part', {
                customerId,
                partNumber: partNumber.trim().toUpperCase(),
                month, year,
                monthlyTarget: 0, week1Target: 0, week2Target: 0, week3Target: 0, week4Target: 0,
                readyForDispatch: 0,
            });
            toast.success(`Part ${partNumber.trim().toUpperCase()} added to ${lineName}`);
            onAdd();
            onClose();
        } catch {
            toast.error('Failed to add part');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-white font-semibold text-base">Add Part to Line</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                    Adding to <span className="text-white font-medium">{lineName}</span> for {MONTH_SHORT[month - 1]} {year}
                </p>
                <input
                    autoFocus
                    type="text"
                    placeholder="Part number (e.g. 16705)"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 font-mono uppercase placeholder:normal-case placeholder:font-sans"
                    value={partNumber}
                    onChange={e => setPartNumber(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
                />
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">Cancel</button>
                    <button
                        onClick={submit}
                        disabled={!partNumber.trim() || saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-2 transition-colors font-medium"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Add Part
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Column header definitions ────────────────────────────────────────────────

const TH_BASE = 'px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap';

// ─── Line Card ────────────────────────────────────────────────────────────────

interface LineCardProps {
    line: LineGroup;
    month: number;
    year: number;
    onRowChange: (customerId: string, partNumber: string, field: EditableField, value: number) => void;
    onSaveRow: (customerId: string, partNumber: string) => Promise<void>;
    onAddPart: (customerId: string) => void;
    savingKeys: Set<string>;
    dirtyKeys: Set<string>;
}

function LineCard({ line, month, year, onRowChange, onSaveRow, onAddPart, savingKeys, dirtyKeys }: LineCardProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [showAllParts, setShowAllParts] = useState(false);

    const dispatch = line.totals.dispatched;
    const target = line.totals.monthlyTarget;
    const progress = pct(dispatch, target);
    const hasDirty = line.rows.some(r => dirtyKeys.has(`${r.customerId}__${r.partNumber}`));

    // Only show rows that have activity (target/WIP/dispatched) unless showAllParts is true
    const activeRows = line.rows.filter(r =>
        r.monthlyTarget > 0 || r.wip > 0 || r.dispatched > 0 || r.readyForDispatch > 0 ||
        dirtyKeys.has(`${r.customerId}__${r.partNumber}`)  // always show rows being edited
    );
    const visibleRows = showAllParts ? line.rows : activeRows;
    const hiddenCount = line.rows.length - activeRows.length;

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
            {/* ── Header ── */}
            <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-700/30 transition-colors select-none"
                onClick={() => setCollapsed(c => !c)}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-400 flex-shrink-0">
                        {collapsed ? <ChevronRight size={17} /> : <ChevronDown size={17} />}
                    </span>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-white font-bold text-[15px] truncate">{line.lineName}</span>
                        <span className="text-slate-500 text-xs font-mono hidden sm:inline">{line.customerCode}</span>
                        <span className="bg-slate-700/80 text-slate-300 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                            {showAllParts ? line.rows.length : activeRows.length} / {line.rows.length} parts
                        </span>
                        {hasDirty && (
                            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                                Unsaved
                            </span>
                        )}
                    </div>
                </div>

                {/* KPI strip */}
                <div className="flex items-center gap-4 flex-shrink-0 ml-4" onClick={e => e.stopPropagation()}>
                    <div className="text-right hidden lg:block">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Target</div>
                        <div className="text-white font-bold text-sm">{target.toLocaleString()}</div>
                    </div>
                    <div className="text-right hidden lg:block">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1"><Truck size={9} />Dispatched</div>
                        <div className={`font-bold text-sm ${dispatch >= target && target > 0 ? 'text-emerald-400' : 'text-white'}`}>{dispatch.toLocaleString()}</div>
                    </div>
                    <div className="text-right hidden xl:block">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide flex items-center gap-1"><Wrench size={9} />WIP</div>
                        <div className="text-amber-400 font-bold text-sm">{line.totals.wip.toLocaleString()}</div>
                    </div>
                    <div className="text-right hidden xl:block">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Balance</div>
                        <div className={`font-bold text-sm ${line.totals.balance === 0 && target > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {line.totals.balance.toLocaleString()}
                        </div>
                    </div>
                    {target > 0 && (
                        <div className="w-24 hidden sm:block">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                                <span>Progress</span>
                                <span className="font-medium">{progress}%</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${progressBarColor(progress, line.totals.balance)}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Table ── */}
            {!collapsed && (
                <div className="overflow-x-auto border-t border-slate-700/40">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-900/60 text-slate-400 text-left">
                                <th className={`${TH_BASE} pl-5 text-left`}>Part No.</th>
                                <th className={`${TH_BASE} text-left hidden md:table-cell`}>Description</th>
                                {/* Editable columns */}
                                <th className={`${TH_BASE} text-right text-blue-400`}>Monthly Target</th>
                                <th className={`${TH_BASE} text-right text-slate-400`}>Wk 1</th>
                                <th className={`${TH_BASE} text-right text-slate-400`}>Wk 2</th>
                                <th className={`${TH_BASE} text-right text-slate-400`}>Wk 3</th>
                                <th className={`${TH_BASE} text-right text-slate-400`}>Wk 4</th>
                                <th className={`${TH_BASE} text-right text-teal-400`}>
                                    <span className="flex items-center justify-end gap-1"><PackageCheck size={11} />Ready</span>
                                </th>
                                {/* Read-only columns */}
                                <th className={`${TH_BASE} text-right text-emerald-400`}>
                                    <span className="flex items-center justify-end gap-1"><Truck size={11} />Dispatched</span>
                                </th>
                                <th className={`${TH_BASE} text-right text-amber-400`}>
                                    <span className="flex items-center justify-end gap-1"><Wrench size={11} />WIP</span>
                                </th>
                                <th className={`${TH_BASE} text-right text-red-400`}>Balance</th>
                                <th className={`${TH_BASE} text-center`}>Progress</th>
                                <th className={`${TH_BASE} pr-4 text-center`}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/30">
                            {line.rows.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="px-5 py-8 text-center text-slate-500 text-sm">
                                        No parts in the Part master yet. Add parts to the master to begin planning.
                                    </td>
                                </tr>
                            )}

                            {line.rows.length > 0 && visibleRows.length === 0 && (
                                <tr>
                                    <td colSpan={13} className="px-5 py-6 text-center text-slate-500 text-sm">
                                        No active parts this month.{' '}
                                        <button
                                            onClick={() => setShowAllParts(true)}
                                            className="text-blue-400 hover:text-blue-300 font-medium underline-offset-2 hover:underline"
                                        >
                                            Show all {line.rows.length} parts to set targets
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {visibleRows.map((row, i) => {
                                const key = `${row.customerId}__${row.partNumber}`;
                                const isSaving = savingKeys.has(key);
                                const isDirty = dirtyKeys.has(key);
                                const rowBg = i % 2 === 0 ? '' : 'bg-slate-900/20';
                                const dirtyHighlight = isDirty ? 'bg-amber-500/5' : '';

                                return (
                                    <tr
                                        key={row.partNumber}
                                        className={`hover:bg-slate-700/20 transition-colors group ${rowBg} ${dirtyHighlight}`}
                                    >
                                        {/* Part Number */}
                                        <td className="px-5 py-2.5">
                                            <span className="text-white font-mono text-xs font-semibold">{row.partNumber}</span>
                                        </td>
                                        {/* Description */}
                                        <td className="px-3 py-2.5 hidden md:table-cell max-w-[150px]">
                                            <span className="text-slate-400 text-xs truncate block">
                                                {row.partName && row.partName !== row.partNumber ? row.partName : '—'}
                                            </span>
                                        </td>
                                        {/* Monthly Target — editable */}
                                        <td className="px-3 py-2.5 text-right">
                                            <EditableCell
                                                value={row.monthlyTarget}
                                                onChange={v => onRowChange(row.customerId, row.partNumber, 'monthlyTarget', v)}
                                                onBlurSave={() => onSaveRow(row.customerId, row.partNumber)}
                                                colorClass="text-blue-300"
                                                isLoading={isSaving}
                                            />
                                        </td>
                                        {/* Weekly targets — editable */}
                                        {(['week1Target', 'week2Target', 'week3Target', 'week4Target'] as EditableField[]).map(field => (
                                            <td key={field} className="px-3 py-2.5 text-right">
                                                <EditableCell
                                                    value={row[field] as number}
                                                    onChange={v => onRowChange(row.customerId, row.partNumber, field, v)}
                                                    onBlurSave={() => onSaveRow(row.customerId, row.partNumber)}
                                                    colorClass="text-slate-300"
                                                    isLoading={isSaving}
                                                />
                                            </td>
                                        ))}
                                        {/* Ready for dispatch — editable */}
                                        <td className="px-3 py-2.5 text-right">
                                            <EditableCell
                                                value={row.readyForDispatch}
                                                onChange={v => onRowChange(row.customerId, row.partNumber, 'readyForDispatch', v)}
                                                onBlurSave={() => onSaveRow(row.customerId, row.partNumber)}
                                                colorClass="text-teal-300"
                                                isLoading={isSaving}
                                            />
                                        </td>
                                        {/* Dispatched — read-only */}
                                        <td className="px-3 py-2.5 text-right">
                                            <span className={`text-sm font-medium ${row.dispatched > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                                                {row.dispatched > 0 ? row.dispatched.toLocaleString() : '—'}
                                            </span>
                                        </td>
                                        {/* WIP — read-only */}
                                        <td className="px-3 py-2.5 text-right">
                                            <span className={`text-sm font-medium ${row.wip > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                                                {row.wip > 0 ? row.wip.toLocaleString() : '—'}
                                            </span>
                                        </td>
                                        {/* Balance — read-only */}
                                        <td className="px-3 py-2.5 text-right">
                                            <BalanceBadge balance={row.balance} target={row.monthlyTarget} />
                                        </td>
                                        {/* Progress mini bar */}
                                        <td className="px-3 py-2.5">
                                            <MiniProgress dispatched={row.dispatched} target={row.monthlyTarget} />
                                        </td>
                                        {/* Save indicator */}
                                        <td className="pr-4 py-2.5 text-center">
                                            {isSaving ? (
                                                <Loader2 size={13} className="animate-spin text-blue-400 mx-auto" />
                                            ) : isDirty ? (
                                                <button
                                                    onClick={() => onSaveRow(row.customerId, row.partNumber)}
                                                    title="Save changes"
                                                    className="text-amber-400 hover:text-amber-300 transition-colors mx-auto block"
                                                >
                                                    <Save size={13} />
                                                </button>
                                            ) : (
                                                <CheckCircle2 size={13} className="text-slate-700 mx-auto opacity-0 group-hover:opacity-30 transition-opacity" />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Totals row */}
                            {line.rows.length > 0 && (
                                <tr className="bg-slate-900/60 border-t-2 border-slate-600/50 font-semibold text-xs">
                                    <td className="pl-5 py-2.5 text-slate-400 uppercase tracking-wide">Line Total</td>
                                    <td className="hidden md:table-cell" />
                                    <td className="px-3 py-2.5 text-right text-blue-300">{line.totals.monthlyTarget.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{line.totals.week1Target.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{line.totals.week2Target.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{line.totals.week3Target.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-slate-300">{line.totals.week4Target.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-teal-300">{line.totals.readyForDispatch.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-emerald-400">{line.totals.dispatched.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-amber-400">{line.totals.wip.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-red-400">{line.totals.balance.toLocaleString()}</td>
                                    <td />
                                    <td />
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Footer: toggle + add part */}
                    <div className="px-5 py-2.5 border-t border-slate-700/30 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            {hiddenCount > 0 && (
                                <button
                                    onClick={() => setShowAllParts(v => !v)}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                                >
                                    {showAllParts
                                        ? <><ChevronDown size={12} /> Hide {hiddenCount} blank parts</>
                                        : <><ChevronRight size={12} /> Show all {line.rows.length} parts ({hiddenCount} blank)</>
                                    }
                                </button>
                            )}
                        </div>
                        <span className="text-xs text-slate-600 italic hidden sm:inline">
                            ✎ Click any cell to edit targets
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LineDeadlinesPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState<MonthData | null>(null);
    const [loading, setLoading] = useState(false);
    const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
    const [drafts, setDrafts] = useState<Record<string, Partial<LineDeadlineRow>>>({});
    const [addingFor, setAddingFor] = useState<string | null>(null);

    const dirtyKeys = new Set(Object.keys(drafts).filter(k => Object.keys(drafts[k]).length > 0));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/line-deadlines?month=${month}&year=${year}`);
            setData(res.data);
            setDrafts({});
        } catch {
            toast.error('Failed to load line deadlines');
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Apply local draft on top of server data for display
    function getDisplayData(): MonthData | null {
        if (!data) return null;
        return {
            ...data,
            lines: data.lines.map(line => ({
                ...line,
                rows: line.rows.map(row => {
                    const key = `${row.customerId}__${row.partNumber}`;
                    const draft = drafts[key] ?? {};
                    const merged = { ...row, ...draft };
                    merged.balance = Math.max(0, (merged.monthlyTarget ?? row.monthlyTarget) - row.dispatched);
                    return merged;
                }),
                // Recompute totals with drafts applied
                totals: (() => {
                    const rows = line.rows.map(row => {
                        const key = `${row.customerId}__${row.partNumber}`;
                        return { ...row, ...(drafts[key] ?? {}) };
                    });
                    return rows.reduce((acc, r) => ({
                        monthlyTarget: acc.monthlyTarget + (r.monthlyTarget ?? 0),
                        week1Target: acc.week1Target + (r.week1Target ?? 0),
                        week2Target: acc.week2Target + (r.week2Target ?? 0),
                        week3Target: acc.week3Target + (r.week3Target ?? 0),
                        week4Target: acc.week4Target + (r.week4Target ?? 0),
                        readyForDispatch: acc.readyForDispatch + (r.readyForDispatch ?? 0),
                        dispatched: acc.dispatched + r.dispatched,
                        wip: acc.wip + r.wip,
                        balance: acc.balance + Math.max(0, (r.monthlyTarget ?? 0) - r.dispatched),
                    }), { monthlyTarget: 0, week1Target: 0, week2Target: 0, week3Target: 0, week4Target: 0, readyForDispatch: 0, dispatched: 0, wip: 0, balance: 0 });
                })(),
            })),
        };
    }

    function handleRowChange(customerId: string, partNumber: string, field: EditableField, value: number) {
        const key = `${customerId}__${partNumber}`;
        setDrafts(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));
    }

    async function handleSaveRow(customerId: string, partNumber: string) {
        const key = `${customerId}__${partNumber}`;
        const draft = drafts[key];
        if (!draft || Object.keys(draft).length === 0) return;

        const originalRow = data?.lines.find(l => l.customerId === customerId)?.rows.find(r => r.partNumber === partNumber);
        if (!originalRow) return;

        setSavingKeys(prev => new Set([...prev, key]));
        try {
            const payload = { ...originalRow, ...draft, month, year };
            await apiClient.patch('/line-deadlines/upsert', { items: [payload] });
            setDrafts(prev => { const next = { ...prev }; delete next[key]; return next; });
            await fetchData();
            toast.success(`Saved ${partNumber}`, { duration: 1500 });
        } catch {
            toast.error(`Failed to save ${partNumber}`);
        } finally {
            setSavingKeys(prev => { const next = new Set(prev); next.delete(key); return next; });
        }
    }

    async function handleSaveAll() {
        const allDirty = Object.keys(drafts).filter(k => Object.keys(drafts[k]).length > 0);
        if (allDirty.length === 0) return;

        const items = allDirty.map(key => {
            const [customerId, partNumber] = key.split('__');
            const originalRow = data?.lines.find(l => l.customerId === customerId)?.rows.find(r => r.partNumber === partNumber);
            return { ...originalRow, ...drafts[key], customerId, partNumber, month, year };
        });

        setSavingKeys(new Set(allDirty));
        try {
            await apiClient.patch('/line-deadlines/upsert', { items });
            setDrafts({});
            await fetchData();
            toast.success(`Saved ${allDirty.length} row${allDirty.length !== 1 ? 's' : ''}`);
        } catch {
            toast.error('Bulk save failed');
        } finally {
            setSavingKeys(new Set());
        }
    }

    const displayData = getDisplayData();
    const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);
    const totalDirty = dirtyKeys.size;
    const grandTotals = displayData?.grandTotals;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6 space-y-6">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
                        <ClipboardList size={22} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Line Deadlines</h1>
                        <p className="text-slate-400 text-sm">Monthly dispatch targets per customer line</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Month picker */}
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                        <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                        <select
                            value={month}
                            onChange={e => setMonth(Number(e.target.value))}
                            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                        >
                            {MONTH_NAMES.map((name, i) => (
                                <option key={i + 1} value={i + 1}>{name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Year picker */}
                    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
                        <select
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                            className="bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {/* Refresh */}
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {/* Save All */}
                    {totalDirty > 0 && (
                        <button
                            onClick={handleSaveAll}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg"
                        >
                            <Save size={14} />
                            Save All ({totalDirty})
                        </button>
                    )}
                </div>
            </div>

            {/* ── Grand KPI Strip ── */}
            {grandTotals && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Monthly Target', value: grandTotals.monthlyTarget, icon: <Target size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                        { label: 'Dispatched', value: grandTotals.dispatched, icon: <Truck size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'WIP', value: grandTotals.wip, icon: <Wrench size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Ready to Ship', value: grandTotals.readyForDispatch, icon: <PackageCheck size={16} />, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
                        { label: 'Balance', value: grandTotals.balance, icon: <AlertTriangle size={16} />, color: grandTotals.balance === 0 ? 'text-emerald-400' : 'text-red-400', bg: grandTotals.balance === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20' },
                    ].map(({ label, value, icon, color, bg }) => (
                        <div key={label} className={`border rounded-2xl px-4 py-3.5 ${bg}`}>
                            <div className={`flex items-center gap-1.5 text-xs font-medium mb-1.5 ${color}`}>
                                {icon}{label}
                            </div>
                            <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 size={22} className="animate-spin" />
                    <span>Loading line data…</span>
                </div>
            )}

            {/* ── Line Cards ── */}
            {!loading && displayData && (
                <div className="space-y-4">
                    {displayData.lines.length === 0 && (
                        <div className="text-center py-16 text-slate-500">
                            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-base font-medium">No active customer lines found</p>
                            <p className="text-sm mt-1">Add customers in the Customers module to begin planning.</p>
                        </div>
                    )}
                    {displayData.lines.map(line => (
                        <LineCard
                            key={line.customerId}
                            line={line}
                            month={displayData.month}
                            year={displayData.year}
                            onRowChange={handleRowChange}
                            onSaveRow={handleSaveRow}
                            onAddPart={setAddingFor}
                            savingKeys={savingKeys}
                            dirtyKeys={dirtyKeys}
                        />
                    ))}
                </div>
            )}

            {/* ── Legend ── */}
            {!loading && displayData && displayData.lines.length > 0 && (
                <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2 border-t border-slate-800">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Monthly Target — set by planner</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Dispatched — auto from dispatch plans</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />WIP — parts at vendors (issued − completed)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />Ready to Ship — set by production team</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Balance — target − dispatched</span>
                </div>
            )}

            {/* ── Add Part Dialog ── */}
            {addingFor && displayData && (
                <AddPartDialog
                    customerId={addingFor}
                    lineName={displayData.lines.find(l => l.customerId === addingFor)?.lineName ?? ''}
                    month={displayData.month}
                    year={displayData.year}
                    onAdd={fetchData}
                    onClose={() => setAddingFor(null)}
                />
            )}
        </div>
    );
}