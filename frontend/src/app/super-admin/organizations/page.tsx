'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { platformService } from '@/services/platform-service';
import { apiClient } from '@/lib/api-client';
import {
    Building2, Users, Truck, CreditCard, Power, Search, RefreshCw,
    Plus, ChevronDown, ChevronUp, ExternalLink, Check, Edit, X,
    UserPlus, ShieldCheck, Mail, Phone, Briefcase, Eye, EyeOff,
} from 'lucide-react';
import Link from 'next/link';

interface Organization {
    id: string; name: string; code: string; gstin?: string;
    subscriptionTier: string; subscriptionStatus: string; isActive: boolean;
    paymentValidUntil?: string; maxUsers: number; maxVendors: number;
    _count: { users: number; vendors: number; customers: number; purchaseOrders: number };
}

interface OrgUser {
    id: string; firstName?: string; lastName?: string; email: string;
    role: string; isActive: boolean; designation?: string; department?: string; lastLogin?: string;
}

type FilterStatus = 'all' | 'active' | 'suspended';
type FilterTier = 'all' | 'enterprise' | 'paid' | 'trial';
type SortKey = 'name' | 'users' | 'tier' | 'expiry';

const ORG_ROLES = [
    { value: 'admin', label: 'Admin' },
    { value: 'director', label: 'Director' },
    { value: 'gm', label: 'General Manager' },
    { value: 'executive', label: 'Executive' },
    { value: 'plant_head', label: 'Plant Head' },
    { value: 'production_manager', label: 'Production Manager' },
    { value: 'ppc_manager', label: 'PPC Manager' },
    { value: 'quality_head', label: 'Quality Head' },
    { value: 'quality_supervisor', label: 'Quality Supervisor' },
    { value: 'accounts_manager', label: 'Accounts Manager' },
    { value: 'store_keeper', label: 'Store Keeper' },
    { value: 'customer', label: 'Customer' },
];

const DEPARTMENTS = ['executive', 'production', 'planning', 'quality', 'vendor'];

function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function tierClass(tier: string) {
    const m: Record<string, string> = {
        enterprise: 'bg-purple-100 text-purple-700 border-purple-200',
        paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        trial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return m[tier] || 'bg-slate-100 text-slate-600 border-slate-200';
}

function ExpiryChip({ dateStr }: { dateStr?: string }) {
    if (!dateStr) return <span className="text-xs text-slate-400">—</span>;
    const days = daysUntil(dateStr);
    if (days === null) return null;
    const color = days <= 0 ? 'text-red-600 bg-red-50' : days <= 7 ? 'text-orange-600 bg-orange-50' : days <= 14 ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-50';
    const label = days <= 0 ? 'Expired' : `${days}d left`;
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

// ─── Add User Form (inside slide-out) ─────────────────────────────────────────
function AddUserForm({ org, onSuccess, onCancel }: { org: Organization; onSuccess: () => void; onCancel: () => void }) {
    const [form, setForm] = useState({
        email: '', password: '', firstName: '', lastName: '',
        role: 'admin', department: '', designation: '', phone: '',
    });
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await apiClient.post('/users', {
                ...form,
                organizationId: org.id,
                department: form.department || undefined,
                designation: form.designation || undefined,
                phone: form.phone || undefined,
            });
            onSuccess();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                    <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Rahul" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                    <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Sharma" />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="user@company.com" />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} required minLength={6} value={form.password} onChange={e => set('password', e.target.value)}
                        className="w-full pr-10 pl-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                        {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role <span className="text-red-500">*</span></label>
                <div className="relative">
                    <ShieldCheck className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <select value={form.role} onChange={e => set('role', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white">
                        {ORG_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
                    <select value={form.department} onChange={e => set('department', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white capitalize">
                        <option value="">None</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input value={form.phone} onChange={e => set('phone', e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="+91 98765..." />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input value={form.designation} onChange={e => set('designation', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. Senior Manager" />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <X className="w-3.5 h-3.5 shrink-0" /> {error}
                </div>
            )}

            <div className="flex gap-2 pt-1">
                <button type="button" onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
                    Cancel
                </button>
                <button type="submit" disabled={loading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                    {loading ? 'Creating...' : 'Create User'}
                </button>
            </div>
        </form>
    );
}

// ─── Users Slide-Out Panel ────────────────────────────────────────────────────
function UsersPanel({ org, onClose }: { org: Organization; onClose: () => void }) {
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/users?organizationId=${org.id}`);
            setUsers(Array.isArray(res.data) ? res.data : res.data.data || []);
        } catch { setUsers([]); } finally { setLoading(false); }
    };

    useEffect(() => { loadUsers(); }, [org.id]);

    const handleUserCreated = () => {
        setAdding(false);
        loadUsers();
    };

    const roleLabel = (role: string) => role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const roleColor = (role: string) => {
        if (role === 'admin' || role === 'director') return 'bg-indigo-100 text-indigo-700';
        if (role === 'gm' || role === 'executive') return 'bg-blue-100 text-blue-700';
        if (role.includes('manager') || role.includes('head')) return 'bg-purple-100 text-purple-700';
        return 'bg-slate-100 text-slate-600';
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" />
                            <h2 className="text-base font-bold text-slate-900">{org.name}</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {org._count.users} of {org.maxUsers} users · <span className={`font-semibold ${tierClass(org.subscriptionTier).split(' ')[1]}`}>{org.subscriptionTier}</span> plan
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add User toggle */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    {!adding ? (
                        <button
                            onClick={() => setAdding(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors w-full justify-center"
                        >
                            <UserPlus className="w-4 h-4" /> Add User to {org.name}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4 text-indigo-500" /> New User
                                </p>
                            </div>
                            <AddUserForm org={org} onSuccess={handleUserCreated} onCancel={() => setAdding(false)} />
                        </div>
                    )}
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="py-12 text-center text-sm text-slate-400 animate-pulse">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-500">No users yet</p>
                            <p className="text-xs text-slate-400 mt-1">Add the first user to get this organization started.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {users.map(u => (
                                <li key={u.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/50">
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                                        {(u.firstName?.[0] || u.email[0]).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '—'}
                                            </p>
                                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 uppercase ${roleColor(u.role)}`}>
                                                {roleLabel(u.role)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                        {u.designation && <p className="text-[11px] text-slate-400">{u.designation}</p>}
                                    </div>
                                    <div className="shrink-0">
                                        <span className={`flex items-center gap-1 text-[11px] font-medium ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-400 text-center">
                    {users.length} user{users.length !== 1 ? 's' : ''} · {org.maxUsers - users.length} seat{org.maxUsers - users.length !== 1 ? 's' : ''} remaining
                </div>
            </div>
        </>
    );
}

// ─── Billing Modal ─────────────────────────────────────────────────────────────
function BillingModal({ org, onClose, onSuccess }: { org: Organization; onClose: () => void; onSuccess: () => void }) {
    const [amount, setAmount] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try { await platformService.logPayment(org.id, parseFloat(amount), validUntil); onSuccess(); onClose(); }
        catch { alert('Failed to log payment'); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div><h3 className="text-base font-bold text-slate-900">Record Payment</h3><p className="text-xs text-slate-500 mt-0.5">{org.name}</p></div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid (₹)</label>
                        <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 50000" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Valid Until</label>
                        <input type="date" required value={validUntil} onChange={e => setValidUntil(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                            {loading ? 'Saving...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function LimitsModal({ org, onClose, onSuccess }: { org: Organization; onClose: () => void; onSuccess: () => void }) {
    const [maxUsers, setMaxUsers] = useState(String(org.maxUsers));
    const [maxVendors, setMaxVendors] = useState(String(org.maxVendors));
    const [tier, setTier] = useState(org.subscriptionTier);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            await platformService.updateOrganizationLimits(org.id, { maxUsers: parseInt(maxUsers), maxVendors: parseInt(maxVendors), subscriptionTier: tier });
            onSuccess(); onClose();
        } catch { alert('Failed to update limits'); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div><h3 className="text-base font-bold text-slate-900">Edit Plan & Limits</h3><p className="text-xs text-slate-500 mt-0.5">{org.name}</p></div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Subscription Tier</label>
                        <select value={tier} onChange={e => setTier(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="trial">Trial</option><option value="paid">Paid</option><option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Users</label>
                            <input type="number" required min="1" value={maxUsers} onChange={e => setMaxUsers(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Vendors</label>
                            <input type="number" required min="1" value={maxVendors} onChange={e => setMaxVendors(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [filterTier, setFilterTier] = useState<FilterTier>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [sortAsc, setSortAsc] = useState(true);
    const [billingOrg, setBillingOrg] = useState<Organization | null>(null);
    const [limitsOrg, setLimitsOrg] = useState<Organization | null>(null);
    const [usersOrg, setUsersOrg] = useState<Organization | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [impersonating, setImpersonating] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try { const data = await platformService.getOrganizations(); setOrgs(data); }
        catch {} finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleToggle = async (org: Organization) => {
        if (!confirm(`${org.isActive ? 'Suspend' : 'Activate'} ${org.name}?`)) return;
        setToggling(org.id);
        try { await platformService.toggleStatus(org.id, !org.isActive); await load(); }
        catch { alert('Failed to update status'); } finally { setToggling(null); }
    };

    const handleImpersonate = async (org: Organization) => {
        if (!confirm(`Login as admin of ${org.name}? This action will be logged.`)) return;
        setImpersonating(org.id);
        try {
            const result = await platformService.impersonate(org.id);
            window.localStorage.setItem('auth_token', result.access_token);
            window.location.href = '/dashboard/admin';
        } catch { alert('No admin user found for this organization.'); }
        finally { setImpersonating(null); }
    };

    const filtered = useMemo(() => {
        let r = orgs.filter(o => {
            const q = search.toLowerCase();
            const ms = o.name.toLowerCase().includes(q) || o.code?.toLowerCase().includes(q) || (o.gstin || '').toLowerCase().includes(q);
            const mst = filterStatus === 'all' ? true : filterStatus === 'active' ? o.isActive : !o.isActive;
            const mt = filterTier === 'all' ? true : o.subscriptionTier === filterTier;
            return ms && mst && mt;
        });
        r = r.sort((a, b) => {
            let c = 0;
            if (sortKey === 'name') c = a.name.localeCompare(b.name);
            else if (sortKey === 'users') c = a._count.users - b._count.users;
            else if (sortKey === 'tier') c = a.subscriptionTier.localeCompare(b.subscriptionTier);
            else if (sortKey === 'expiry') {
                const da = a.paymentValidUntil ? new Date(a.paymentValidUntil).getTime() : Infinity;
                const db = b.paymentValidUntil ? new Date(b.paymentValidUntil).getTime() : Infinity;
                c = da - db;
            }
            return sortAsc ? c : -c;
        });
        return r;
    }, [orgs, search, filterStatus, filterTier, sortKey, sortAsc]);

    const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(v => !v); else { setSortKey(k); setSortAsc(true); } };
    const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

    const stats = {
        total: orgs.length,
        active: orgs.filter(o => o.isActive).length,
        enterprise: orgs.filter(o => o.subscriptionTier === 'enterprise').length,
        expiring: orgs.filter(o => { const d = daysUntil(o.paymentValidUntil); return d !== null && d <= 14 && o.isActive; }).length,
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Organizations</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage OEM tenants, plans, limits, billing and users.</p>
                </div>
                <Link href="/dashboard/platform/organizations/create"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Organization
                </Link>
            </div>

            {/* Summary chips */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-white border-slate-200' },
                    { label: 'Active', value: stats.active, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                    { label: 'Enterprise', value: stats.enterprise, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                    { label: 'Expiring Soon', value: stats.expiring, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                ].map(s => (
                    <div key={s.label} className={`rounded-lg border px-4 py-3 ${s.bg}`}>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search name, code, GSTIN..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none">
                    <option value="all">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option>
                </select>
                <select value={filterTier} onChange={e => setFilterTier(e.target.value as FilterTier)}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none">
                    <option value="all">All Plans</option><option value="enterprise">Enterprise</option><option value="paid">Paid</option><option value="trial">Trial</option>
                </select>
                <button onClick={load} className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">No organizations found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    {([['name', 'Organization'], ['tier', 'Plan'], ['users', 'Usage'], ['expiry', 'Expiry']] as [SortKey, string][]).map(([k, label]) => (
                                        <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-slate-600">
                                                {label} <SortIcon k={k} />
                                            </button>
                                        </th>
                                    ))}
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(org => (
                                    <tr key={org.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-slate-800">{org.name}</p>
                                            <p className="text-xs text-slate-400 font-mono uppercase mt-0.5">{org.code}</p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 uppercase border ${tierClass(org.subscriptionTier)}`}>
                                                {org.subscriptionTier}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1 text-xs text-slate-600">
                                                    <Users className="w-3 h-3 text-slate-400" /> {org._count.users}/{org.maxUsers} users
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-slate-600">
                                                    <Truck className="w-3 h-3 text-slate-400" /> {org._count.vendors}/{org.maxVendors} vendors
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5"><ExpiryChip dateStr={org.paymentValidUntil} /></td>
                                        <td className="px-4 py-3.5">
                                            <span className={`flex items-center gap-1.5 text-xs font-semibold ${org.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${org.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {org.isActive ? 'Active' : 'Suspended'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* ← NEW: Manage Users button */}
                                                <button
                                                    onClick={() => setUsersOrg(org)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors"
                                                >
                                                    <Users className="w-3 h-3" /> Users
                                                </button>
                                                <button onClick={() => setBillingOrg(org)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                                                    <CreditCard className="w-3 h-3" /> Payment
                                                </button>
                                                <button onClick={() => setLimitsOrg(org)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg">
                                                    <Edit className="w-3 h-3" /> Limits
                                                </button>
                                                <button onClick={() => handleImpersonate(org)} disabled={impersonating === org.id}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-50">
                                                    <ExternalLink className="w-3 h-3" />
                                                    {impersonating === org.id ? '...' : 'Enter'}
                                                </button>
                                                <button onClick={() => handleToggle(org)} disabled={toggling === org.id}
                                                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border rounded-lg disabled:opacity-50 ${org.isActive ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>
                                                    {toggling === org.id ? <RefreshCw className="w-3 h-3 animate-spin" /> :
                                                        org.isActive ? <><Power className="w-3 h-3" /> Suspend</> : <><Check className="w-3 h-3" /> Activate</>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/50">
                        Showing {filtered.length} of {orgs.length} organizations
                    </div>
                )}
            </div>

            {/* Modals & Panels */}
            {usersOrg && (
                <UsersPanel
                    org={usersOrg}
                    onClose={() => { setUsersOrg(null); load(); }}
                />
            )}
            {billingOrg && <BillingModal org={billingOrg} onClose={() => setBillingOrg(null)} onSuccess={load} />}
            {limitsOrg && <LimitsModal org={limitsOrg} onClose={() => setLimitsOrg(null)} onSuccess={load} />}
        </div>
    );
}
