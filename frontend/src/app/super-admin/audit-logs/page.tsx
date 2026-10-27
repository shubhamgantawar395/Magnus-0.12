'use client';

import React, { useEffect, useState } from 'react';
import { platformService } from '@/services/platform-service';
import {
    ScrollText, RefreshCw, CheckCircle, XCircle, CreditCard,
    Power, Activity, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface AuditLog {
    id: string;
    action: string;
    details: string;
    createdAt: string;
    admin?: { id: string; firstName: string; lastName: string; email: string };
    organization?: { id: string; name: string };
}

const ACTION_COLORS: Record<string, string> = {
    APPROVE_VENDOR: 'bg-emerald-100 text-emerald-700',
    REJECT_VENDOR: 'bg-red-100 text-red-700',
    ENABLE_ORGANIZATION: 'bg-emerald-100 text-emerald-700',
    DISABLE_ORGANIZATION: 'bg-red-100 text-red-700',
    LOG_PAYMENT: 'bg-indigo-100 text-indigo-700',
    UPDATE_LIMITS: 'bg-blue-100 text-blue-700',
    IMPERSONATE_LOGIN: 'bg-orange-100 text-orange-700',
};

function actionIcon(action: string) {
    if (action.includes('APPROVE') || action.includes('ENABLE')) return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    if (action.includes('REJECT') || action.includes('DISABLE')) return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    if (action.includes('PAYMENT')) return <CreditCard className="w-3.5 h-3.5 text-indigo-600" />;
    if (action.includes('IMPERSONATE')) return <Power className="w-3.5 h-3.5 text-orange-500" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
}

function formatAction(action: string) {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const PAGE_SIZE = 15;

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('all');
    const [page, setPage] = useState(1);

    const load = async () => {
        setLoading(true);
        try {
            const data = await platformService.getPlatformAuditLogs();
            setLogs(data);
        } catch (e) {
            console.error('Failed to load audit logs', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort();

    const filtered = logs.filter(l => {
        const q = search.toLowerCase();
        const matchQ = !q || l.action.toLowerCase().includes(q) ||
            (l.organization?.name || '').toLowerCase().includes(q) ||
            (l.admin?.email || '').toLowerCase().includes(q) ||
            l.details.toLowerCase().includes(q);
        const matchAction = filterAction === 'all' || l.action === filterAction;
        return matchQ && matchAction;
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSearch = (val: string) => { setSearch(val); setPage(1); };
    const handleFilter = (val: string) => { setFilterAction(val); setPage(1); };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Platform Audit Log</h1>
                    <p className="text-sm text-slate-500 mt-0.5">All admin actions on the platform — immutable record.</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Actions', value: logs.length },
                    { label: 'Approvals', value: logs.filter(l => l.action.includes('APPROVE') || l.action.includes('ENABLE')).length },
                    { label: 'Rejections / Suspensions', value: logs.filter(l => l.action.includes('REJECT') || l.action.includes('DISABLE')).length },
                    { label: 'Payments Logged', value: logs.filter(l => l.action === 'LOG_PAYMENT').length },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg border border-slate-200 px-4 py-3">
                        <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search action, org, admin email..."
                        value={search} onChange={e => handleSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <select value={filterAction} onChange={e => handleFilter(e.target.value)}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none">
                    <option value="all">All Actions</option>
                    {uniqueActions.map(a => (
                        <option key={a} value={a}>{formatAction(a)}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading audit logs...</div>
                ) : paginated.length === 0 ? (
                    <div className="py-16 text-center">
                        <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">No logs found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Performed By</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginated.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                {actionIcon(log.action)}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                                                    {formatAction(log.action)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {log.organization ? (
                                                <span className="text-sm font-medium text-slate-700">{log.organization.name}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {log.admin ? (
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{log.admin.firstName} {log.admin.lastName}</p>
                                                    <p className="text-xs text-slate-400">{log.admin.email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">System</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5 max-w-xs">
                                            <p className="text-xs text-slate-500 truncate" title={log.details}>{log.details || '—'}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-xs font-medium text-slate-600">{timeAgo(log.createdAt)}</p>
                                            <p className="text-[11px] text-slate-400">{formatDate(log.createdAt)}</p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} logs
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => p - 1)} disabled={page === 1}
                                className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                const p = i + 1;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-7 h-7 text-xs font-medium rounded ${page === p ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                                className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
