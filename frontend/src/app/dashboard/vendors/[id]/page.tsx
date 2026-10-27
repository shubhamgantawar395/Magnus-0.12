'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/user';
import {
    ArrowLeft, Building2, MapPin, Mail, Phone, Settings, FileText,
    CheckCircle, Package, Edit2, Save, X, Loader2, Plus, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Roles allowed to edit vendor details
const EDIT_ROLES = new Set<string>([
    UserRole.PLATFORM_ADMIN, 'admin',
    UserRole.DIRECTOR, UserRole.GM, UserRole.EXECUTIVE,
    UserRole.PPC_MANAGER, UserRole.PRODUCTION_MANAGER, UserRole.PLANT_HEAD,
]);

// Helper: map raw API vendor → form defaults
// API returns email/phone (schema names); DTO uses contactEmail/contactPhone
function vendorToForm(v: any) {
    return {
        companyName:   v.companyName   || '',
        contactPerson: v.contactPerson || '',
        contactEmail:  v.email         || '',   // schema field: email
        contactPhone:  v.phone         || '',   // schema field: phone
        address:       v.address       || '',
        city:          v.city          || '',
        state:         v.state         || '',
        pincode:       v.pincode       || '',
        gstin:         v.gstin         || '',
    };
}

// Empty capability form
const emptyCap = () => ({ processName: '', machineCount: '', capacityPerMonth: '' });

export default function VendorProfilePage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params.id as string;
    const { token, user } = useAuthStore();

    const [vendor, setVendor] = useState<any>(null);
    const [stockStatements, setStockStatements] = useState<any[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'profile' | 'stock' | 'orders'>('profile');

    // Details edit state
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(vendorToForm({}));

    // Capability edit state
    const [capEditing, setCapEditing] = useState(false);
    const [capForm, setCapForm] = useState(emptyCap());
    const [capSaving, setCapSaving] = useState(false);
    const [deletingCapId, setDeletingCapId] = useState<string | null>(null);

    const canEdit = user && EDIT_ROLES.has(user.role);

    useEffect(() => {
        if (vendorId && token) fetchVendorData();
    }, [vendorId, token]);

    const fetchVendorData = async () => {
        try {
            const [vendorRes, ordersRes, stockRes] = await Promise.allSettled([
                apiClient.get(`/vendors/${vendorId}`),
                apiClient.get('/purchase-orders'),
                apiClient.get('/stock-statements'),
            ]);

            if (vendorRes.status === 'fulfilled') {
                const v = vendorRes.value.data;
                setVendor(v);
                setForm(vendorToForm(v));
            } else {
                toast.error('Failed to load vendor profile');
            }
            if (ordersRes.status === 'fulfilled') {
                const all = Array.isArray(ordersRes.value.data) ? ordersRes.value.data : (ordersRes.value.data?.data || []);
                setPurchaseOrders(all.filter((po: any) => po.vendorId === vendorId));
            }
            if (stockRes.status === 'fulfilled') {
                const all = Array.isArray(stockRes.value.data) ? stockRes.value.data : (stockRes.value.data?.data || []);
                setStockStatements(all.filter((st: any) => st.vendorId === vendorId));
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Vendor details handlers ─────────────────────────────────────────────
    const handleEdit = () => setEditing(true);

    const handleCancel = () => {
        setForm(vendorToForm(vendor));
        setEditing(false);
    };

    const handleSave = async () => {
        if (!form.companyName.trim()) { toast.error('Company name is required'); return; }
        setSaving(true);
        try {
            // Strip empty strings so optional validators (e.g. @IsEmail) don't fire on blank fields
            const payload = Object.fromEntries(
                Object.entries(form).filter(([, v]) => v !== '')
            );
            const res = await apiClient.patch(`/vendors/${vendorId}`, payload);
            // Merge returned data back (schema uses email/phone; keep vendor consistent)
            setVendor({ ...vendor, ...res.data });
            setEditing(false);
            toast.success('Vendor details updated successfully');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to save changes'));
        } finally {
            setSaving(false);
        }
    };

    const field = (key: keyof typeof form) => (
        <Input
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="bg-slate-800 border-slate-700 text-white focus:border-indigo-500 h-9 text-sm"
        />
    );

    // ── Capability handlers ─────────────────────────────────────────────────
    const handleAddCap = async () => {
        if (!capForm.processName.trim()) { toast.error('Process name is required'); return; }
        setCapSaving(true);
        try {
            const res = await apiClient.post(`/vendors/${vendorId}/capabilities`, {
                processName:       capForm.processName.trim(),
                machineCount:      parseInt(capForm.machineCount) || 0,
                capacityPerMonth:  parseInt(capForm.capacityPerMonth) || 0,
            });
            setVendor((v: any) => ({ ...v, capabilities: [...(v.capabilities || []), res.data] }));
            setCapForm(emptyCap());
            setCapEditing(false);
            toast.success('Capability added');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to add capability'));
        } finally {
            setCapSaving(false);
        }
    };

    const handleDeleteCap = async (capId: string) => {
        setDeletingCapId(capId);
        try {
            await apiClient.delete(`/vendors/${vendorId}/capabilities/${capId}`);
            setVendor((v: any) => ({ ...v, capabilities: v.capabilities.filter((c: any) => c.id !== capId) }));
            toast.success('Capability removed');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to remove capability'));
        } finally {
            setDeletingCapId(null);
        }
    };

    // ───────────────────────────────────────────────────────────────────────
    if (loading) return <div className="p-8 text-center text-slate-400">Loading Vendor Profile...</div>;
    if (!vendor)  return <div className="p-8 text-center text-red-400">Vendor not found</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">{vendor.companyName}</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {vendor.vendorCode} •{' '}
                        {vendor.status === 'approved' ? (
                            <span className="text-emerald-400 flex items-center gap-1 text-sm">
                                <CheckCircle className="w-3 h-3" /> Active Partner
                            </span>
                        ) : (
                            <span className="text-amber-400 text-sm">Pending Verification</span>
                        )}
                    </p>
                </div>

                {/* Edit / Save / Cancel buttons for details */}
                {canEdit && activeTab === 'profile' && (
                    <div className="ml-auto flex items-center gap-2">
                        {editing ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                >
                                    <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {saving
                                        ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
                                        : <><Save className="w-4 h-4 mr-1" /> Save Changes</>}
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                onClick={handleEdit}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Edit2 className="w-4 h-4 mr-1" /> Edit Details
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-800">
                {(['profile', 'stock', 'orders'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); if (editing) handleCancel(); }}
                        className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        {tab === 'orders' ? `Active POs (${purchaseOrders.filter(p => p.status === 'approved').length})` : tab === 'stock' ? 'Stock Statement' : 'Overview & Capabilities'}
                    </button>
                ))}
            </div>

            {/* ── Profile Tab ─────────────────────────────────────── */}
            {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business Details Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                            Business Details
                            {editing && <span className="ml-2 text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Editing</span>}
                        </h2>

                        {editing ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400">Company Name *</Label>
                                    {field('companyName')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400">Street Address</Label>
                                    {field('address')}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-400">City</Label>
                                        {field('city')}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-400">State</Label>
                                        {field('state')}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-400">Pincode</Label>
                                        {field('pincode')}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-400">GSTIN</Label>
                                        <Input
                                            value={form.gstin}
                                            onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))}
                                            className="bg-slate-800 border-slate-700 text-white font-mono uppercase focus:border-indigo-500 h-9 text-sm"
                                            maxLength={15}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-3 text-sm">
                                    <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-white">{vendor.address || '—'}</p>
                                        <p className="text-slate-400">{[vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-400">Email</p>
                                        <p className="text-white">{vendor.email || '—'}</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-800">
                                    <p className="text-sm text-slate-400">
                                        GSTIN: <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded">{vendor.gstin || '—'}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contact + Capabilities Card */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">
                            Contact Information
                        </h2>

                        {editing ? (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Contact Person
                                    </Label>
                                    {field('contactPerson')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400 flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> Email
                                    </Label>
                                    {field('contactEmail')}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Phone
                                    </Label>
                                    {field('contactPhone')}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-400">Contact Person</p>
                                        <p className="text-white">{vendor.contactPerson || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-400">Email</p>
                                        <p className="text-white">{vendor.email || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div>
                                        <p className="text-slate-400">Phone</p>
                                        <p className="text-white">{vendor.phone || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Machine Capabilities */}
                        <div className="mt-6 pt-4 border-t border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-slate-500" /> Machine Capabilities
                                </h3>
                                {canEdit && !capEditing && (
                                    <button
                                        onClick={() => setCapEditing(true)}
                                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Add
                                    </button>
                                )}
                            </div>

                            {/* Add capability form */}
                            {capEditing && (
                                <div className="mb-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700 space-y-2">
                                    <Input
                                        placeholder="Process name (e.g. CNC Turning)"
                                        value={capForm.processName}
                                        onChange={e => setCapForm(f => ({ ...f, processName: e.target.value }))}
                                        className="bg-slate-800 border-slate-600 text-white h-8 text-xs"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder="No. of machines"
                                            type="number"
                                            min={0}
                                            value={capForm.machineCount}
                                            onChange={e => setCapForm(f => ({ ...f, machineCount: e.target.value }))}
                                            className="bg-slate-800 border-slate-600 text-white h-8 text-xs"
                                        />
                                        <Input
                                            placeholder="Capacity / month"
                                            type="number"
                                            min={0}
                                            value={capForm.capacityPerMonth}
                                            onChange={e => setCapForm(f => ({ ...f, capacityPerMonth: e.target.value }))}
                                            className="bg-slate-800 border-slate-600 text-white h-8 text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            onClick={handleAddCap}
                                            disabled={capSaving}
                                            className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs px-3"
                                        >
                                            {capSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => { setCapEditing(false); setCapForm(emptyCap()); }}
                                            className="border-slate-600 text-slate-300 hover:bg-slate-800 h-7 text-xs px-3"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Capabilities list */}
                            {vendor?.capabilities?.length > 0 ? (
                                <div className="space-y-2">
                                    {vendor.capabilities.map((cap: any) => (
                                        <div key={cap.id} className="flex items-center justify-between p-2.5 bg-slate-800/50 rounded-lg border border-slate-800 text-sm">
                                            <div>
                                                <p className="font-medium text-white">{cap.processName}</p>
                                                <p className="text-xs text-slate-400">{cap.machineCount} machines · {cap.capacityPerMonth}/mo</p>
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDeleteCap(cap.id)}
                                                    disabled={deletingCapId === cap.id}
                                                    className="p-1 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                                                    title="Remove capability"
                                                >
                                                    {deletingCapId === cap.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-4">No capabilities registered</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stock Tab ───────────────────────────────────────── */}
            {activeTab === 'stock' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-800">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Package className="w-5 h-5 text-indigo-400" /> Reported Stock Audit Logs
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">Snapshot history of vendor material inventory.</p>
                    </div>
                    {stockStatements.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <Package className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            <p>No stock statements submitted by this vendor yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {stockStatements.map((stmt) => (
                                <div key={stmt.id} className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <p className="text-indigo-400 font-medium text-lg">Statement: {stmt.statementNumber}</p>
                                            <p className="text-sm text-slate-400">Generated: {new Date(stmt.statementDate).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${stmt.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                            {stmt.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3">Part Details</th>
                                                    <th className="px-4 py-3 text-right">Physical</th>
                                                    <th className="px-4 py-3 text-right">WIP</th>
                                                    <th className="px-4 py-3 text-right">Scrap</th>
                                                    <th className="px-4 py-3">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {stmt.items?.map((item: any) => (
                                                    <tr key={item.id} className="hover:bg-slate-800/20">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-white">{item.partNumber}</div>
                                                            <div className="text-xs text-slate-400">{item.partDescription}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{item.physicalStockQty}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-indigo-400">{item.wipStockQty}</td>
                                                        <td className="px-4 py-3 text-right font-mono text-red-400">{item.scrapQty}</td>
                                                        <td className="px-4 py-3 text-slate-400 text-xs">{item.remarks}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Orders Tab ──────────────────────────────────────── */}
            {activeTab === 'orders' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    {purchaseOrders.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <FileText className="w-8 h-8 opacity-20 mx-auto mb-2" />
                            <p>No active purchase orders found for this vendor.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50 border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">PO Number</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Delivery Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {purchaseOrders.map((po) => (
                                    <tr key={po.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{po.poNumber}</td>
                                        <td className="px-6 py-4 text-slate-400">{new Date(po.poDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-slate-400">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded text-xs font-medium">
                                                {po.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-white">₹{po.totalAmount?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
