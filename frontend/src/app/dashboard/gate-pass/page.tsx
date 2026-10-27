'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
    ShieldCheck, UserPlus, LogOut, Clock, Users, CheckCircle2,
    Search, X, Calendar, Phone, Building2, Car, BadgeCheck,
    AlertTriangle, ChevronDown, BookOpen, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GatePass {
    id: string;
    passNumber: string;
    visitorName: string;
    visitorPhone?: string;
    visitorCompany?: string;
    idProofType?: string;
    idProofNumber?: string;
    purpose: string;
    personToMeet?: string;
    vehicleNumber?: string;
    entryTime: string;
    exitTime?: string;
    status: 'active' | 'closed' | 'overstay';
    remarks?: string;
    issuedBy: { firstName: string; lastName: string };
}

interface Stats {
    active: number;
    todayTotal: number;
    todayExited: number;
}

const STATUS_CONFIG = {
    active:   { label: 'Inside',   color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    closed:   { label: 'Exited',   color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    overstay: { label: 'Overstay', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const ID_PROOF_TYPES = ['Aadhar Card', 'PAN Card', 'Driving License', 'Passport', 'Voter ID', 'Employee ID', 'Other'];
const PURPOSES = ['Meeting', 'Delivery', 'Service / Maintenance', 'Interview', 'Vendor Visit', 'Inspection', 'Other'];

function formatDuration(entryTime: string, exitTime?: string): string {
    const start = new Date(entryTime);
    const end = exitTime ? new Date(exitTime) : new Date();
    const mins = Math.floor((end.getTime() - start.getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GatePassPage() {
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [stats, setStats] = useState<Stats>({ active: 0, todayTotal: 0, todayExited: 0 });
    const [loading, setLoading] = useState(true);
    const [mainTab, setMainTab] = useState<'passes' | 'register'>('passes');
    const [tab, setTab] = useState<'active' | 'all'>('active');
    const [search, setSearch] = useState('');

    // Register tab state
    const [regStartDate, setRegStartDate] = useState(todayStr());
    const [regEndDate, setRegEndDate] = useState(todayStr());
    const [regEntries, setRegEntries] = useState<GatePass[]>([]);
    const [regLoading, setRegLoading] = useState(false);
    const [regExporting, setRegExporting] = useState(false);

    // Issue pass modal
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        visitorName: '',
        visitorPhone: '',
        visitorCompany: '',
        idProofType: '',
        idProofNumber: '',
        purpose: '',
        personToMeet: '',
        vehicleNumber: '',
        remarks: '',
    });

    // Exit confirmation
    const [exitPass, setExitPass] = useState<GatePass | null>(null);
    const [exitRemarks, setExitRemarks] = useState('');
    const [marking, setMarking] = useState(false);

    // Detail view
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [passRes, statsRes] = await Promise.all([
                apiClient.get('/gate-passes', { params: { status: tab === 'active' ? 'active' : undefined } }),
                apiClient.get('/gate-passes/stats'),
            ]);
            setPasses(Array.isArray(passRes.data) ? passRes.data : []);
            setStats(statsRes.data || { active: 0, todayTotal: 0, todayExited: 0 });
        } catch {
            toast.error('Failed to load gate passes');
        } finally {
            setLoading(false);
        }
    }, [tab]);

    const fetchRegister = useCallback(async () => {
        setRegLoading(true);
        try {
            const res = await apiClient.get('/gate-passes/register', {
                params: { startDate: regStartDate, endDate: regEndDate }
            });
            setRegEntries(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error('Failed to load visitor register');
        } finally {
            setRegLoading(false);
        }
    }, [regStartDate, regEndDate]);

    const handleExportRegister = async () => {
        setRegExporting(true);
        try {
            const res = await apiClient.get('/gate-passes/register/export', {
                params: { startDate: regStartDate, endDate: regEndDate },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Visitors_Register_${regStartDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Register exported successfully');
        } catch {
            toast.error('Failed to export register');
        } finally {
            setRegExporting(false);
        }
    };

    useEffect(() => {
        if (mainTab === 'register') fetchRegister();
    }, [mainTab, fetchRegister]);

    useEffect(() => {
        setLoading(true);
        fetchAll();
    }, [fetchAll]);

    const handleIssuePass = async () => {
        if (!form.visitorName.trim()) { toast.error('Visitor name is required'); return; }
        if (!form.purpose.trim()) { toast.error('Purpose is required'); return; }
        setSubmitting(true);
        try {
            await apiClient.post('/gate-passes', {
                visitorName: form.visitorName.trim(),
                visitorPhone: form.visitorPhone || undefined,
                visitorCompany: form.visitorCompany || undefined,
                idProofType: form.idProofType || undefined,
                idProofNumber: form.idProofNumber || undefined,
                purpose: form.purpose,
                personToMeet: form.personToMeet || undefined,
                vehicleNumber: form.vehicleNumber || undefined,
                remarks: form.remarks || undefined,
            });
            toast.success('Gate pass issued');
            setShowModal(false);
            setForm({ visitorName: '', visitorPhone: '', visitorCompany: '', idProofType: '', idProofNumber: '', purpose: '', personToMeet: '', vehicleNumber: '', remarks: '' });
            fetchAll();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to issue pass');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkExit = async () => {
        if (!exitPass) return;
        setMarking(true);
        try {
            await apiClient.post(`/gate-passes/${exitPass.id}/exit`, { remarks: exitRemarks || undefined });
            toast.success(`${exitPass.visitorName} exit recorded`);
            setExitPass(null);
            setExitRemarks('');
            fetchAll();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to mark exit');
        } finally {
            setMarking(false);
        }
    };

    const filtered = passes.filter(p =>
        p.visitorName.toLowerCase().includes(search.toLowerCase()) ||
        (p.visitorCompany || '').toLowerCase().includes(search.toLowerCase()) ||
        p.passNumber.toLowerCase().includes(search.toLowerCase()) ||
        (p.vehicleNumber || '').toLowerCase().includes(search.toLowerCase()),
    );

    const setField = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="min-h-screen bg-slate-950 p-6 space-y-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gate Pass</h1>
                        <p className="text-slate-400 text-sm">Visitor management & access control</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setMainTab('passes')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === 'passes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <ShieldCheck className="w-4 h-4" /> Gate Passes
                        </button>
                        <button
                            onClick={() => setMainTab('register')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${mainTab === 'register' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <BookOpen className="w-4 h-4" /> Visitor's Register
                        </button>
                    </div>
                    {mainTab === 'passes' && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
                        >
                            <UserPlus className="w-4 h-4" /> Issue Gate Pass
                        </button>
                    )}
                </div>
            </div>

            {mainTab === 'passes' && (<>
            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Currently Inside', value: stats.active, icon: Users, color: 'emerald' },
                    { label: 'Entered Today', value: stats.todayTotal, icon: BadgeCheck, color: 'blue' },
                    { label: 'Exited Today', value: stats.todayExited, icon: LogOut, color: 'slate' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className={`text-${color}-400 mb-1`}><Icon className="w-4 h-4" /></div>
                        <div className={`text-2xl font-bold text-${color}-400`}>{value}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                ))}
            </div>

            {/* ── Search + Tabs ── */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-48 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        placeholder="Search visitor, company, vehicle..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => setTab('active')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Active ({stats.active})
                    </button>
                    <button
                        onClick={() => setTab('all')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        All Today
                    </button>
                </div>
            </div>

            {/* ── Pass List ── */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-16 text-slate-500">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <ShieldCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">
                            {tab === 'active' ? 'No visitors currently inside' : 'No passes found'}
                        </p>
                    </div>
                ) : (
                    filtered.map(pass => {
                        const sc = STATUS_CONFIG[pass.status] || STATUS_CONFIG.closed;
                        const isExpanded = expandedId === pass.id;
                        const duration = formatDuration(pass.entryTime, pass.exitTime || undefined);
                        return (
                            <div key={pass.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                <div className="flex items-center justify-between p-4 gap-4">
                                    {/* Avatar + Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold flex-shrink-0">
                                            {pass.visitorName[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-white">{pass.visitorName}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                                                <span className="font-mono text-xs text-slate-500">{pass.passNumber}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                                                {pass.visitorCompany && <span><Building2 className="w-3 h-3 inline mr-1" />{pass.visitorCompany}</span>}
                                                <span><Clock className="w-3 h-3 inline mr-1" />In: {formatTime(pass.entryTime)}</span>
                                                {pass.exitTime && <span>Out: {formatTime(pass.exitTime)}</span>}
                                                <span className={pass.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}>
                                                    {duration}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : pass.id)}
                                            className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                        {pass.status === 'active' && (
                                            <button
                                                onClick={() => { setExitPass(pass); setExitRemarks(''); }}
                                                className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <LogOut className="w-3.5 h-3.5" /> Mark Exit
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800 px-4 py-3 bg-slate-800/30 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                        {[
                                            { icon: BadgeCheck, label: 'Purpose', value: pass.purpose },
                                            { icon: Users, label: 'Meeting', value: pass.personToMeet },
                                            { icon: Phone, label: 'Phone', value: pass.visitorPhone },
                                            { icon: Car, label: 'Vehicle', value: pass.vehicleNumber },
                                            { icon: BadgeCheck, label: 'ID Proof', value: pass.idProofType ? `${pass.idProofType}${pass.idProofNumber ? ' — ' + pass.idProofNumber : ''}` : undefined },
                                            { icon: Calendar, label: 'Issued By', value: `${pass.issuedBy.firstName} ${pass.issuedBy.lastName}` },
                                        ].map(({ icon: Icon, label, value }) => value ? (
                                            <div key={label}>
                                                <p className="text-slate-500 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
                                                <p className="text-slate-200 mt-0.5">{value}</p>
                                            </div>
                                        ) : null)}
                                        {pass.remarks && (
                                            <div className="col-span-2 sm:col-span-3">
                                                <p className="text-slate-500">Remarks</p>
                                                <p className="text-slate-300 mt-0.5">{pass.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
            </>)}

            {/* ══════════════════════════════════════════════════════════
                VISITOR'S REGISTER TAB
            ══════════════════════════════════════════════════════════ */}
            {mainTab === 'register' && (
                <div className="space-y-4">
                    {/* Date range controls */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">From Date</label>
                            <input
                                type="date"
                                value={regStartDate}
                                onChange={e => setRegStartDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">To Date</label>
                            <input
                                type="date"
                                value={regEndDate}
                                onChange={e => setRegEndDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <button
                            onClick={fetchRegister}
                            disabled={regLoading}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                            {regLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Load Register
                        </button>
                        <button
                            onClick={handleExportRegister}
                            disabled={regExporting || regEntries.length === 0}
                            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors ml-auto"
                        >
                            <Download className="w-4 h-4" />
                            {regExporting ? 'Exporting...' : 'Download Excel'}
                        </button>
                    </div>

                    {/* Register Table */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-2 text-amber-400 font-semibold">
                                <BookOpen className="w-4 h-4" />
                                Visitor&apos;s Register
                                <span className="text-slate-500 font-normal text-sm ml-1">
                                    {regEntries.length > 0 ? `(${regEntries.length} entries)` : ''}
                                </span>
                            </div>
                        </div>

                        {regLoading ? (
                            <div className="text-center py-12 text-slate-400">Loading register...</div>
                        ) : regEntries.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-400">No entries found for selected date range</p>
                                <p className="text-slate-600 text-sm mt-1">Select a date range and click &quot;Load Register&quot;</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left">#</th>
                                            <th className="px-4 py-3 text-left">Pass No.</th>
                                            <th className="px-4 py-3 text-left">Visitor</th>
                                            <th className="px-4 py-3 text-left">Company</th>
                                            <th className="px-4 py-3 text-left hidden md:table-cell">Purpose</th>
                                            <th className="px-4 py-3 text-left hidden lg:table-cell">ID Proof</th>
                                            <th className="px-4 py-3 text-left hidden lg:table-cell">Vehicle</th>
                                            <th className="px-4 py-3 text-left">Entry</th>
                                            <th className="px-4 py-3 text-left">Exit</th>
                                            <th className="px-4 py-3 text-left">Duration</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {regEntries.map((p, idx) => {
                                            const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.closed;
                                            return (
                                                <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-indigo-400">{p.passNumber}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-white">{p.visitorName}</div>
                                                        {p.visitorPhone && <div className="text-xs text-slate-500">{p.visitorPhone}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-300">{p.visitorCompany || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{p.purpose}</td>
                                                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">
                                                        {p.idProofType ? `${p.idProofType}${p.idProofNumber ? ': ' + p.idProofNumber : ''}` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{p.vehicleNumber || '—'}</td>
                                                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{formatTime(p.entryTime)}</td>
                                                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{p.exitTime ? formatTime(p.exitTime) : '—'}</td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <span className={p.status === 'active' ? 'text-emerald-400' : 'text-slate-500'}>
                                                            {formatDuration(p.entryTime, p.exitTime || undefined)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                ISSUE GATE PASS MODAL
            ══════════════════════════════════════════════════════════ */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <h2 className="text-lg font-bold text-white">Issue Gate Pass</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Pass number will be auto-assigned</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Visitor Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Visitor Name *</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        placeholder="Full name"
                                        value={form.visitorName}
                                        onChange={e => setField('visitorName', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Phone</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        placeholder="Mobile number"
                                        value={form.visitorPhone}
                                        onChange={e => setField('visitorPhone', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Company / Organisation</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        placeholder="Company name"
                                        value={form.visitorCompany}
                                        onChange={e => setField('visitorCompany', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* ID Proof */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">ID Proof Type</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                        value={form.idProofType}
                                        onChange={e => setField('idProofType', e.target.value)}
                                    >
                                        <option value="">Select ID type</option>
                                        {ID_PROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">ID Number</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        placeholder="ID / card number"
                                        value={form.idProofNumber}
                                        onChange={e => setField('idProofNumber', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Purpose + Meeting */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Purpose *</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                        value={form.purpose}
                                        onChange={e => setField('purpose', e.target.value)}
                                    >
                                        <option value="">Select purpose</option>
                                        {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Person to Meet</label>
                                    <input
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                        placeholder="Employee name / dept"
                                        value={form.personToMeet}
                                        onChange={e => setField('personToMeet', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Vehicle */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Number (if any)</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                    placeholder="MH-12-AB-1234"
                                    value={form.vehicleNumber}
                                    onChange={e => setField('vehicleNumber', e.target.value)}
                                />
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Remarks</label>
                                <textarea
                                    rows={2}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                                    placeholder="Additional notes..."
                                    value={form.remarks}
                                    onChange={e => setField('remarks', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
                                Cancel
                            </button>
                            <button
                                onClick={handleIssuePass}
                                disabled={submitting}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                            >
                                {submitting
                                    ? <><Clock className="w-4 h-4 animate-spin" /> Issuing...</>
                                    : <><BadgeCheck className="w-4 h-4" /> Issue Pass</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                MARK EXIT CONFIRMATION
            ══════════════════════════════════════════════════════════ */}
            {exitPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                                    <LogOut className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">Confirm Exit</h3>
                                    <p className="text-xs text-slate-400">{exitPass.passNumber} · {exitPass.visitorName}</p>
                                </div>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3 mb-4 text-sm">
                                <div className="flex justify-between text-slate-400 mb-1">
                                    <span>Entry</span>
                                    <span className="text-white">{formatTime(exitPass.entryTime)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Duration inside</span>
                                    <span className="text-emerald-400 font-semibold">{formatDuration(exitPass.entryTime)}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Exit Remarks (optional)</label>
                                <input
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                                    placeholder="Any notes on exit..."
                                    value={exitRemarks}
                                    onChange={e => setExitRemarks(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 px-5 pb-5">
                            <button
                                onClick={() => setExitPass(null)}
                                className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMarkExit}
                                disabled={marking}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                            >
                                {marking
                                    ? <><Clock className="w-4 h-4 animate-spin" /> Recording...</>
                                    : <><CheckCircle2 className="w-4 h-4" /> Confirm Exit</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
