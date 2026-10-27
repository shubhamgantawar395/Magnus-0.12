'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
    ArrowLeft, Plus, Trash2, Loader2, Package,
    ChevronDown, AlertCircle, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Supplier { id: string; companyName: string; supplierCode: string; materialTypes: string[] }
interface PurchaseOrder { id: string; poNumber: string; vendor?: { companyName: string }; items: POItem[] }
interface POItem { id: string; partNumber: string; partDescription: string | null; quantity: number; grnItems?: { receivedQty: number }[] }

interface GRNItemRow {
    poItemId: string;
    partNumber: string;
    partDescription: string;
    expectedQty: number;
    receivedQty: number;
    rejectedQty: number;
    remarks: string;
}

export default function CreateGRNPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [pos, setPOs] = useState<PurchaseOrder[]>([]);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

    // Header fields
    const [grnDate, setGrnDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [supplierId, setSupplierId] = useState('');
    const [poId, setPoId] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    // Line items
    const [items, setItems] = useState<GRNItemRow[]>([]);

    useEffect(() => {
        apiClient.get('/suppliers?limit=200').then(r => setSuppliers(r.data?.data || r.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!supplierId) { setPOs([]); return; }
        apiClient.get(`/purchase-orders?status=approved`)
            .then(r => {
                // Filter POs that match the selected supplier (POs are vendor-linked, not supplier-linked directly)
                // Show all approved POs for now — user will select the matching one
                setPOs((r.data?.data || r.data || []).slice(0, 50));
            })
            .catch(() => {});
    }, [supplierId]);

    const handlePOChange = useCallback(async (id: string) => {
        setPoId(id);
        if (!id) { setSelectedPO(null); setItems([]); return; }
        try {
            const res = await apiClient.get(`/purchase-orders/${id}`);
            const po = res.data;
            setSelectedPO(po);
            // Pre-fill items from PO items
            const rows: GRNItemRow[] = (po.items || []).map((item: POItem) => {
                const alreadyReceived = (item.grnItems || []).reduce((s: number, g: any) => s + g.receivedQty, 0);
                const pending = Math.max(0, item.quantity - alreadyReceived);
                return {
                    poItemId: item.id,
                    partNumber: item.partNumber,
                    partDescription: item.partDescription || '',
                    expectedQty: pending,
                    receivedQty: pending,
                    rejectedQty: 0,
                    remarks: '',
                };
            });
            setItems(rows.filter(r => r.expectedQty > 0));
        } catch {
            toast.error('Failed to load PO details');
        }
    }, []);

    const addBlankItem = () => {
        setItems(prev => [...prev, {
            poItemId: '', partNumber: '', partDescription: '', expectedQty: 0,
            receivedQty: 0, rejectedQty: 0, remarks: '',
        }]);
    };

    const updateItem = (idx: number, field: keyof GRNItemRow, value: string | number) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId) return toast.error('Select a supplier');
        if (items.length === 0) return toast.error('Add at least one item');
        for (const item of items) {
            if (!item.partNumber.trim()) return toast.error('Part number is required for all items');
            if (item.receivedQty <= 0) return toast.error(`Received qty must be > 0 for ${item.partNumber}`);
            if (item.rejectedQty > item.receivedQty) return toast.error(`Rejected qty cannot exceed received qty for ${item.partNumber}`);
        }

        setSaving(true);
        try {
            await apiClient.post('/supplier-grn', {
                grnDate,
                supplierId,
                poId: poId || undefined,
                vehicleNumber: vehicleNumber || undefined,
                driverName: driverName || undefined,
                invoiceNumber: invoiceNumber || undefined,
                remarks: remarks || undefined,
                items: items.map(item => ({
                    poItemId: item.poItemId || undefined,
                    partNumber: item.partNumber,
                    partDescription: item.partDescription || undefined,
                    expectedQty: item.expectedQty,
                    receivedQty: item.receivedQty,
                    rejectedQty: item.rejectedQty,
                    remarks: item.remarks || undefined,
                })),
            });
            toast.success('GRN created successfully');
            router.push('/dashboard/supplier-grn');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create GRN');
        } finally {
            setSaving(false);
        }
    };

    const totalReceived = items.reduce((s, i) => s + (i.receivedQty || 0), 0);
    const totalRejected = items.reduce((s, i) => s + (i.rejectedQty || 0), 0);

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/supplier-grn" className="text-slate-500 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Package className="w-6 h-6 text-emerald-400" />
                            New Supplier GRN
                        </h1>
                        <p className="text-slate-500 text-sm">Record casting / forging inward from supplier</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* GRN Details */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">GRN Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">GRN Date *</label>
                                <input
                                    type="date"
                                    value={grnDate}
                                    onChange={e => setGrnDate(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Supplier *</label>
                                <div className="relative">
                                    <select
                                        value={supplierId}
                                        onChange={e => setSupplierId(e.target.value)}
                                        required
                                        className="w-full appearance-none px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 pr-8"
                                    >
                                        <option value="">— Select supplier —</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.companyName} ({s.supplierCode})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Against PO (optional)</label>
                                <div className="relative">
                                    <select
                                        value={poId}
                                        onChange={e => handlePOChange(e.target.value)}
                                        className="w-full appearance-none px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 pr-8"
                                    >
                                        <option value="">— No PO / standalone receipt —</option>
                                        {pos.map(po => (
                                            <option key={po.id} value={po.id}>{po.poNumber}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                                </div>
                                {selectedPO && (
                                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Items pre-filled from PO — edit received quantities as needed
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Supplier Invoice / DC No.</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                    placeholder="e.g. DC/2026/03/007"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Vehicle Number</label>
                                <input
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={e => setVehicleNumber(e.target.value)}
                                    placeholder="e.g. MH12AB1234"
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 mb-1">Driver Name</label>
                                <input
                                    type="text"
                                    value={driverName}
                                    onChange={e => setDriverName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs text-slate-500 mb-1">Remarks</label>
                                <textarea
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    rows={2}
                                    placeholder="Any notes about this delivery..."
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-600 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                                Received Items {items.length > 0 && <span className="text-white">({items.length})</span>}
                            </h2>
                            <button
                                type="button"
                                onClick={addBlankItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Item
                            </button>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
                                <Package className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">
                                    {supplierId
                                        ? poId
                                            ? 'No pending PO items to receive'
                                            : 'Click "Add Item" to add received parts'
                                        : 'Select a supplier first'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                                            <th className="py-2 pr-3 text-left">Part No.</th>
                                            <th className="py-2 pr-3 text-left">Description</th>
                                            <th className="py-2 pr-3 text-right">PO Pending</th>
                                            <th className="py-2 pr-3 text-right">Received *</th>
                                            <th className="py-2 pr-3 text-right">Rejected</th>
                                            <th className="py-2 pr-3 text-right text-emerald-400">Accepted</th>
                                            <th className="py-2 pr-3 text-left">Remarks</th>
                                            <th className="py-2 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {items.map((item, idx) => {
                                            const accepted = (item.receivedQty || 0) - (item.rejectedQty || 0);
                                            return (
                                                <tr key={idx} className="hover:bg-slate-800/20">
                                                    <td className="py-2 pr-3">
                                                        <input
                                                            type="text"
                                                            value={item.partNumber}
                                                            onChange={e => updateItem(idx, 'partNumber', e.target.value)}
                                                            placeholder="16705"
                                                            className="w-24 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-3">
                                                        <input
                                                            type="text"
                                                            value={item.partDescription}
                                                            onChange={e => updateItem(idx, 'partDescription', e.target.value)}
                                                            placeholder="Part name"
                                                            className="w-32 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-emerald-500"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-3 text-right text-slate-400 text-xs">
                                                        {item.expectedQty > 0 ? item.expectedQty.toLocaleString() : '—'}
                                                    </td>
                                                    <td className="py-2 pr-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.receivedQty || ''}
                                                            onChange={e => updateItem(idx, 'receivedQty', parseInt(e.target.value) || 0)}
                                                            className="w-24 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs text-right focus:outline-none focus:border-emerald-500"
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-3">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={item.receivedQty}
                                                            value={item.rejectedQty || ''}
                                                            onChange={e => updateItem(idx, 'rejectedQty', parseInt(e.target.value) || 0)}
                                                            className={`w-20 px-2 py-1.5 bg-slate-800 border rounded text-xs text-right focus:outline-none ${item.rejectedQty > 0 ? 'border-red-500/50 text-red-400' : 'border-slate-700 text-white'}`}
                                                        />
                                                    </td>
                                                    <td className="py-2 pr-3 text-right">
                                                        <span className={`text-sm font-semibold ${accepted >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {accepted.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 pr-3">
                                                        <input
                                                            type="text"
                                                            value={item.remarks}
                                                            onChange={e => updateItem(idx, 'remarks', e.target.value)}
                                                            placeholder="Optional"
                                                            className="w-28 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs focus:outline-none focus:border-emerald-500"
                                                        />
                                                    </td>
                                                    <td className="py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="text-slate-600 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t border-slate-700 text-xs font-semibold">
                                        <tr>
                                            <td colSpan={3} className="py-3 text-slate-400 uppercase tracking-wider">Total</td>
                                            <td className="py-3 text-right text-white">{totalReceived.toLocaleString()}</td>
                                            <td className="py-3 text-right text-red-400">{totalRejected.toLocaleString()}</td>
                                            <td className="py-3 text-right text-emerald-400">{(totalReceived - totalRejected).toLocaleString()}</td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {totalRejected > 0 && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                {totalRejected.toLocaleString()} units rejected at gate — these will not count towards store balance.
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <Link
                            href="/dashboard/supplier-grn"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save GRN'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
