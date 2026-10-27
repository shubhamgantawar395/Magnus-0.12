'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    Plus, Search, Package, Pencil, Trash2, X, Save, Loader2,
    ArrowLeft, ChevronRight, Factory,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

const MATERIAL_TYPES = ['casting', 'forging', 'sheet_metal', 'bar_stock', 'rubber', 'other'] as const;
type MaterialType = typeof MATERIAL_TYPES[number];

interface Supplier {
    id: string;
    supplierCode: string;
    companyName: string;
    materialTypes: string[];
    contactPerson: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    gstin: string | null;
    isActive: boolean;
    _count: { parts: number };
}

const BLANK: Partial<Supplier> & { materialTypes: string[] } = {
    companyName: '', supplierCode: '', materialTypes: [],
    contactPerson: '', email: '', phone: '', address: '', gstin: '', isActive: true,
};

const MATERIAL_COLORS: Record<string, string> = {
    casting: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    forging: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    sheet_metal: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    bar_stock: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    rubber: 'bg-green-500/15 text-green-400 border-green-500/20',
    other: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
};

// ── Modal ─────────────────────────────────────────────────────────────────────

function SupplierModal({
    supplier, onClose, onSaved,
}: {
    supplier: Partial<Supplier> | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!supplier?.id;
    const [form, setForm] = useState({ ...BLANK, ...(supplier || {}) });
    const [saving, setSaving] = useState(false);

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const toggleMaterial = (t: string) => {
        set('materialTypes', form.materialTypes.includes(t)
            ? form.materialTypes.filter(x => x !== t)
            : [...form.materialTypes, t]);
    };

    const save = async () => {
        if (!form.companyName || !form.supplierCode || form.materialTypes.length === 0) {
            toast.error('Company name, supplier code and at least one material type are required');
            return;
        }
        setSaving(true);
        try {
            if (isEdit) {
                await apiClient.patch(`/suppliers/${supplier!.id}`, form);
                toast.success('Supplier updated');
            } else {
                await apiClient.post('/suppliers', form);
                toast.success('Supplier created');
            }
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="font-semibold text-white">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Basic info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Company Name *</label>
                            <input value={form.companyName} onChange={e => set('companyName', e.target.value)}
                                placeholder="ABC Castings Ltd"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Supplier Code *</label>
                            <input value={form.supplierCode} onChange={e => set('supplierCode', e.target.value)}
                                placeholder="SUP-001"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>

                    {/* Material types */}
                    <div>
                        <label className="text-xs text-slate-400 mb-2 block">Material Types * (select all that apply)</label>
                        <div className="flex flex-wrap gap-2">
                            {MATERIAL_TYPES.map(t => (
                                <button key={t} type="button" onClick={() => toggleMaterial(t)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${
                                        form.materialTypes.includes(t)
                                            ? MATERIAL_COLORS[t]
                                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
                                    }`}>
                                    {t.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Contact Person</label>
                            <input value={form.contactPerson || ''} onChange={e => set('contactPerson', e.target.value)}
                                placeholder="Ramesh Kumar"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Phone</label>
                            <input value={form.phone || ''} onChange={e => set('phone', e.target.value)}
                                placeholder="+91 98765 43210"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Email</label>
                            <input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)}
                                placeholder="supplier@example.com"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">GSTIN</label>
                            <input value={form.gstin || ''} onChange={e => set('gstin', e.target.value)}
                                placeholder="22AAAAA0000A1Z5"
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Address</label>
                        <textarea value={form.address || ''} onChange={e => set('address', e.target.value)}
                            rows={2} placeholder="Full address"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={save} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? 'Update' : 'Create Supplier'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [modal, setModal] = useState<Partial<Supplier> | null | false>(false); // false=closed, null=new, Supplier=edit

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (filterType) params.set('materialType', filterType);
            const res = await apiClient.get(`/suppliers?${params}`);
            setSuppliers(res.data.data || []);
        } catch {
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    }, [search, filterType]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const handleDelete = async (s: Supplier) => {
        if (!confirm(`Delete supplier "${s.companyName}"? This will unlink ${s._count.parts} part(s).`)) return;
        try {
            await apiClient.delete(`/suppliers/${s.id}`);
            toast.success('Supplier deleted');
            load();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/admin" className="text-slate-500 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Factory className="w-6 h-6 text-orange-400" />
                                Suppliers
                            </h1>
                            <p className="text-slate-500 text-sm">Raw material suppliers — casting, forging houses</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setModal(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> New Supplier
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, code, contact…"
                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500" />
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                        <option value="">All Material Types</option>
                        {MATERIAL_TYPES.map(t => (
                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-7 h-7 text-orange-400 animate-spin" />
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="text-center py-20 text-slate-600">
                        <Factory className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">No suppliers yet</p>
                        <p className="text-sm mt-1">Add casting and forging suppliers to link them to your parts</p>
                        <button onClick={() => setModal(null)}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                            Add First Supplier
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800/60 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Supplier</th>
                                    <th className="px-4 py-3">Material Types</th>
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3 text-center">Parts</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {suppliers.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{s.companyName}</div>
                                            <div className="text-xs text-slate-500 font-mono">{s.supplierCode}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {s.materialTypes.map(t => (
                                                    <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${MATERIAL_COLORS[t] || MATERIAL_COLORS.other}`}>
                                                        {t.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">
                                            <div>{s.contactPerson || '—'}</div>
                                            {s.phone && <div className="text-xs">{s.phone}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s._count.parts > 0 ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800 text-slate-600'}`}>
                                                <Package className="w-3 h-3" />
                                                {s._count.parts}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setModal(s)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors rounded">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(s)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-600">
                            {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                )}
            </div>

            {modal !== false && (
                <SupplierModal
                    supplier={modal}
                    onClose={() => setModal(false)}
                    onSaved={load}
                />
            )}
        </div>
    );
}
