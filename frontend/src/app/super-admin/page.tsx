'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { platformService } from '@/services/platform-service';
import toast from 'react-hot-toast';
import {
    Building2,
    Users,
    Truck,
    CreditCard,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowRight,
    TrendingUp,
    Clock,
    Activity,
    RefreshCw,
    Power,
    ExternalLink,
    ChevronRight,
    Settings,
    KeyRound,
    Eye,
    EyeOff,
    Save,
    Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface KPIs {
    totalOrgs: number;
    totalVendors: number;
    totalUsers: number;
    mrrOrgs: number;
}

interface Organization {
    id: string;
    name: string;
    subscriptionTier: string;
    subscriptionStatus: string;
    isActive: boolean;
    paymentValidUntil?: string;
    _count: { users: number; vendors: number; customers: number; purchaseOrders: number };
}

interface PendingVendor {
    id: string;
    companyName: string;
    gstin?: string;
    capabilities: any[];
    createdAt: string;
}

interface AuditLog {
    id: string;
    action: string;
    details: string;
    createdAt: string;
    admin?: { firstName: string; lastName: string };
    organization?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function tierBadge(tier: string) {
    const map: Record<string, string> = {
        enterprise: 'bg-purple-100 text-purple-700',
        paid: 'bg-emerald-100 text-emerald-700',
        trial: 'bg-yellow-100 text-yellow-700',
    };
    return map[tier] || 'bg-slate-100 text-slate-600';
}

function actionIcon(action: string) {
    if (action.includes('APPROVE')) return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    if (action.includes('REJECT') || action.includes('DISABLE')) return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    if (action.includes('PAYMENT')) return <CreditCard className="w-3.5 h-3.5 text-indigo-500" />;
    if (action.includes('ENABLE')) return <Power className="w-3.5 h-3.5 text-emerald-500" />;
    return <Activity className="w-3.5 h-3.5 text-slate-400" />;
}

function actionLabel(action: string) {
    return action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: number | string; icon: any; color: string; sub?: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full gap-1">
                    <TrendingUp className="w-3 h-3" /> Live
                </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );
}

// ─── API Key Settings Card ────────────────────────────────────────────────────
function ApiKeySettings() {
    const [apiKey, setApiKey] = useState('');
    const [maskedValue, setMaskedValue] = useState<string | null>(null);
    const [isSet, setIsSet] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);

    useEffect(() => {
        platformService.getSettings()
            .then(settings => {
                const s = settings.find((r: any) => r.key === 'ANTHROPIC_API_KEY');
                if (s) { setIsSet(s.isSet); setMaskedValue(s.maskedValue); }
            })
            .catch(() => {})
            .finally(() => setLoadingSettings(false));
    }, []);

    const handleSave = async () => {
        if (!apiKey.trim()) return;
        setSaving(true);
        setTestResult(null);
        try {
            await platformService.saveSetting('ANTHROPIC_API_KEY', apiKey.trim());
            setIsSet(true);
            setMaskedValue(apiKey.trim().replace(/^(sk-ant-[a-zA-Z0-9]{4}).*([a-zA-Z0-9]{4})$/, '$1…$2'));
            setApiKey('');
            setShowKey(false);
            toast.success('API key saved — J.A.R.V.I.S. is now active');
        } catch {
            toast.error('Failed to save API key');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        const keyToTest = apiKey.trim();
        if (!keyToTest) return;
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': keyToTest,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-haiku-4-5-20251001',
                    max_tokens: 5,
                    messages: [{ role: 'user', content: 'hi' }],
                }),
            });
            setTestResult(res.ok ? 'ok' : 'fail');
        } catch {
            setTestResult('fail');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-slate-50">
                <div className="p-2 bg-violet-100 rounded-lg">
                    <KeyRound className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                    <h2 className="text-sm font-semibold text-slate-800">AI Configuration — J.A.R.V.I.S.</h2>
                    <p className="text-xs text-slate-500">Anthropic API key powers all role-based AI assistants</p>
                </div>
                <div className="ml-auto shrink-0">
                    {loadingSettings ? (
                        <span className="text-xs text-slate-400">Checking…</span>
                    ) : isSet ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Not configured
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-4">
                {isSet && maskedValue && (
                    <div className="flex items-center gap-3 px-3.5 py-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <KeyRound className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide mb-0.5">Current active key</p>
                            <p className="text-sm font-mono text-slate-700 truncate">{maskedValue}</p>
                        </div>
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        {isSet ? 'Replace with a new key' : 'Paste your Anthropic API key'}
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
                                placeholder="sk-ant-api03-…"
                                className="w-full pr-10 pl-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white placeholder-slate-300"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <button
                            onClick={handleTest}
                            disabled={!apiKey.trim() || testing}
                            title="Verify the key connects to Anthropic before saving"
                            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            Test
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!apiKey.trim() || saving}
                            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save
                        </button>
                    </div>

                    {testResult === 'ok' && (
                        <p className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Valid — Anthropic responded successfully
                        </p>
                    )}
                    {testResult === 'fail' && (
                        <p className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600">
                            <XCircle className="w-3.5 h-3.5" />
                            Invalid key or connection failed — check and retry
                        </p>
                    )}
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                    Get your free API key from{' '}
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-violet-500 hover:underline">
                        console.anthropic.com
                    </a>
                    {' '}→ API Keys. Once saved, J.A.R.V.I.S. activates instantly across PPC, Executive, Vendor, Accounts, and Quality roles — no server restart required.
                </p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlatformOverview() {
    const [kpis, setKpis] = useState<KPIs | null>(null);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [kpiData, orgData, vendorData] = await Promise.all([
                platformService.getKpis(),
                platformService.getOrganizations(),
                platformService.getPendingVendors(),
            ]);
            setKpis(kpiData);
            setOrgs(orgData);
            setPendingVendors(vendorData);

            // Audit logs — best effort
            try {
                const logs = await platformService.getPlatformAuditLogs();
                setAuditLogs(logs.slice(0, 8));
            } catch {}
        } catch (e) {
            console.error('Failed to load platform overview', e);
        } finally {
            setLoading(false);
            setLastRefresh(new Date());
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleApprove = async (vendor: PendingVendor) => {
        setApproving(vendor.id);
        try {
            await platformService.approveVendor(vendor.id);
            setPendingVendors(prev => prev.filter(v => v.id !== vendor.id));
            if (kpis) setKpis({ ...kpis, totalVendors: kpis.totalVendors + 1 });
        } catch { alert('Failed to approve vendor'); }
        finally { setApproving(null); }
    };

    // Expiring within 14 days
    const expiringOrgs = orgs.filter(o => {
        const d = daysUntil(o.paymentValidUntil);
        return d !== null && d <= 14 && o.isActive;
    }).sort((a, b) => new Date(a.paymentValidUntil!).getTime() - new Date(b.paymentValidUntil!).getTime());

    const suspendedOrgs = orgs.filter(o => !o.isActive);

    const alerts = [
        ...expiringOrgs.map(o => ({
            type: 'warning' as const,
            msg: `${o.name} subscription expires in ${daysUntil(o.paymentValidUntil)} day(s)`,
            href: '/super-admin/organizations',
        })),
        ...(pendingVendors.length > 0 ? [{
            type: 'info' as const,
            msg: `${pendingVendors.length} vendor application${pendingVendors.length > 1 ? 's' : ''} waiting for review`,
            href: '/super-admin/vendors',
        }] : []),
        ...(suspendedOrgs.length > 0 ? [{
            type: 'error' as const,
            msg: `${suspendedOrgs.length} organization${suspendedOrgs.length > 1 ? 's are' : ' is'} currently suspended`,
            href: '/super-admin/organizations',
        }] : []),
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 h-32 animate-pulse">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg mb-3" />
                            <div className="w-16 h-6 bg-slate-100 rounded mb-2" />
                            <div className="w-24 h-4 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Platform Overview</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Last refreshed {timeAgo(lastRefresh.toISOString())}
                    </p>
                </div>
                <button
                    onClick={loadAll}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((alert, i) => (
                        <Link key={i} href={alert.href} className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm font-medium transition-opacity hover:opacity-90 ${
                            alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                            alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                            'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {alert.msg}
                            </div>
                            <ChevronRight className="w-4 h-4 shrink-0" />
                        </Link>
                    ))}
                </div>
            )}

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Total OEM Tenants" value={kpis?.totalOrgs ?? 0} icon={Building2} color="bg-indigo-50 text-indigo-600" sub={`${kpis?.mrrOrgs ?? 0} on paid plan`} />
                <KpiCard label="MRR Subscribers" value={kpis?.mrrOrgs ?? 0} icon={CreditCard} color="bg-emerald-50 text-emerald-600" sub="paying organizations" />
                <KpiCard label="Total Platform Users" value={kpis?.totalUsers ?? 0} icon={Users} color="bg-blue-50 text-blue-600" sub="across all tenants" />
                <KpiCard label="Total Vendors" value={kpis?.totalVendors ?? 0} icon={Truck} color="bg-purple-50 text-purple-600" sub={pendingVendors.length > 0 ? `${pendingVendors.length} pending approval` : 'all verified'} />
            </div>

            {/* Two column section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Pending Vendor Queue */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-amber-500" />
                            <h2 className="text-sm font-semibold text-slate-800">Pending Vendor Approvals</h2>
                            {pendingVendors.length > 0 && (
                                <span className="text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{pendingVendors.length}</span>
                            )}
                        </div>
                        <Link href="/super-admin/vendors" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {pendingVendors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
                            <p className="text-sm font-medium text-slate-700">All clear!</p>
                            <p className="text-xs text-slate-400 mt-1">No pending vendor applications.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {pendingVendors.slice(0, 4).map(vendor => (
                                <li key={vendor.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{vendor.companyName}</p>
                                        <p className="text-xs text-slate-400 mt-0.5 font-mono">{vendor.gstin || 'No GSTIN'}</p>
                                        <p className="text-xs text-slate-400">{vendor.capabilities?.length || 0} capabilities declared</p>
                                    </div>
                                    <button
                                        onClick={() => handleApprove(vendor)}
                                        disabled={approving === vendor.id}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {approving === vendor.id ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-3 h-3" />
                                        )}
                                        Approve
                                    </button>
                                </li>
                            ))}
                            {pendingVendors.length > 4 && (
                                <li className="px-5 py-3 text-center">
                                    <Link href="/super-admin/vendors" className="text-xs text-indigo-600 font-medium hover:underline">
                                        +{pendingVendors.length - 4} more — View all
                                    </Link>
                                </li>
                            )}
                        </ul>
                    )}
                </div>

                {/* Subscriptions at Risk */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <h2 className="text-sm font-semibold text-slate-800">Subscriptions at Risk</h2>
                            {expiringOrgs.length > 0 && (
                                <span className="text-xs font-bold bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{expiringOrgs.length}</span>
                            )}
                        </div>
                        <Link href="/super-admin/organizations" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                            Manage <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {expiringOrgs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mb-3" />
                            <p className="text-sm font-medium text-slate-700">All subscriptions healthy</p>
                            <p className="text-xs text-slate-400 mt-1">No renewals due in the next 14 days.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {expiringOrgs.slice(0, 5).map(org => {
                                const days = daysUntil(org.paymentValidUntil);
                                return (
                                    <li key={org.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{org.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase ${tierBadge(org.subscriptionTier)}`}>
                                                    {org.subscriptionTier}
                                                </span>
                                                <span className="text-xs text-slate-400">{org._count.users} users</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-sm font-bold ${days !== null && days <= 3 ? 'text-red-600' : days !== null && days <= 7 ? 'text-orange-600' : 'text-amber-600'}`}>
                                                {days !== null && days <= 0 ? 'Expired' : `${days}d left`}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {org.paymentValidUntil ? new Date(org.paymentValidUntil).toLocaleDateString('en-IN') : 'N/A'}
                                            </p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* Bottom Row: Org Snapshot + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Recent Organizations */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-sm font-semibold text-slate-800">Recent Organizations</h2>
                        </div>
                        <Link href="/super-admin/organizations" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Organization</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Users</th>
                                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orgs.slice(0, 6).map(org => (
                                    <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3 font-medium text-slate-800">{org.name}</td>
                                        <td className="px-3 py-3">
                                            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 uppercase ${tierBadge(org.subscriptionTier)}`}>
                                                {org.subscriptionTier}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-slate-500">{org._count.users}</td>
                                        <td className="px-3 py-3">
                                            <span className={`flex items-center gap-1.5 text-xs font-medium ${org.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${org.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {org.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {orgs.length === 0 && (
                            <div className="px-5 py-10 text-center text-sm text-slate-400">No organizations yet.</div>
                        )}
                    </div>
                </div>

                {/* Platform Activity Log */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-slate-400" />
                            <h2 className="text-sm font-semibold text-slate-800">Recent Activity</h2>
                        </div>
                        <Link href="/super-admin/audit-logs" className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1">
                            Full log <ExternalLink className="w-3 h-3" />
                        </Link>
                    </div>
                    {auditLogs.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-slate-400">No recent platform activity.</div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {auditLogs.map(log => (
                                <li key={log.id} className="px-5 py-3 flex items-start gap-2.5 hover:bg-slate-50/50">
                                    <div className="mt-0.5 shrink-0">{actionIcon(log.action)}</div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-700">{actionLabel(log.action)}</p>
                                        {log.organization && (
                                            <p className="text-xs text-slate-500 truncate">{log.organization.name}</p>
                                        )}
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {log.admin ? `${log.admin.firstName} ${log.admin.lastName}` : 'System'} · {timeAgo(log.createdAt)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Platform Settings — AI / API Keys */}
            <ApiKeySettings />

        </div>
    );
}
