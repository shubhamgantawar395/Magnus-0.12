'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { AUX_OPTIONS, AuxStatus } from '@/store/aux-store';
import { useAuthStore } from '@/store/auth-store';

interface TeamMember {
    userId: string;
    firstName: string;
    lastName: string;
    role: string;
    status: AuxStatus;
    updatedAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const EXECUTIVE_ROLES = [
    'platform_admin', 'admin', 'director', 'gm', 'plant_head', 'executive',
];

function fmtRole(role: string) {
    return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string) {
    const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (secs < 60)  return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
}

export default function TeamStatusPanel() {
    const { user, token } = useAuthStore();
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<AuxStatus | 'all'>('all');

    const isExecutive = user && EXECUTIVE_ROLES.includes(user.role);

    const fetchStatuses = useCallback(async () => {
        if (!token || !isExecutive) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/aux-status/org`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data);
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, [token, isExecutive]);

    useEffect(() => {
        fetchStatuses();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStatuses, 30_000);
        return () => clearInterval(interval);
    }, [fetchStatuses]);

    if (!isExecutive) return null;

    const filtered = filter === 'all' ? members : members.filter((m) => m.status === filter);

    // Count by status
    const counts = AUX_OPTIONS.reduce((acc, opt) => {
        acc[opt.value] = members.filter((m) => m.status === opt.value).length;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <h3 className="text-white font-semibold text-sm">Team Status</h3>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                        {members.length} online
                    </span>
                </div>
                <button
                    onClick={fetchStatuses}
                    disabled={loading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Refresh statuses"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-1.5 px-4 py-3 flex-wrap border-b border-slate-800/60">
                <button
                    onClick={() => setFilter('all')}
                    className={`text-xs px-2.5 py-1 rounded-full transition-colors font-medium
                        ${filter === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                    All ({members.length})
                </button>
                {AUX_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setFilter(opt.value)}
                        className={`text-xs px-2.5 py-1 rounded-full transition-colors font-medium
                            ${filter === opt.value ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}
                    >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${opt.dot} mr-1.5`} />
                        {opt.label} ({counts[opt.value] ?? 0})
                    </button>
                ))}
            </div>

            {/* Member list */}
            <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm py-8">
                        {members.length === 0 ? 'No team members have set their status yet.' : 'No members with this status.'}
                    </p>
                ) : (
                    filtered.map((m) => {
                        const opt = AUX_OPTIONS.find((o) => o.value === m.status) ?? AUX_OPTIONS[4];
                        return (
                            <div key={m.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
                                        {(m.firstName?.[0] ?? '?').toUpperCase()}
                                        {(m.lastName?.[0]  ?? '').toUpperCase()}
                                    </div>
                                    <span
                                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${opt.dot}`}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-medium truncate">
                                        {m.firstName} {m.lastName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{fmtRole(m.role)}</p>
                                </div>

                                {/* Status + time */}
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-xs font-medium ${opt.color}`}>{opt.label}</p>
                                    <p className="text-xs text-slate-600">{timeAgo(m.updatedAt)}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
