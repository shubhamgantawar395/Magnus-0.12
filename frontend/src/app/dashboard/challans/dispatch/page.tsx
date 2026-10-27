'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';
import {
    Truck, Package, Plus, CheckCircle, Clock, XCircle,
    ChevronDown, ChevronUp, RefreshCw, Calendar, Car, User, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReadyItem {
    challanItemId: string;
    partNumber: string;
    partDescription: string;
    quantityReady: number;
    challanNumber: string;
    challanId: string;
    vendorId: string;
    vendorName: string;
    vendorCode: string;
}

interface DispatchPlan {
    id: string;
    plannedDate: string;
    status: 'planned' | 'in_transit' | 'delivered';
    vendor: { id: string; companyName: string; vendorCode: string };
    customer: { id: string; companyName: string };
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    notes?: string;
    _count: { items: number };
}

const statusConfig = {
    planned: { label: 'Planned', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
    in_transit: { label: 'In Transit', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
};

export default function DispatchManagementPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [readyItems, setReadyItems] = useState<ReadyItem[]>([]);
    const [plans, setPlans] = useState<DispatchPlan[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [confirming, setConfirming] = useState<string | null>(null);

    // Create form state
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
    const [creating, setCreating] = useState(false);

    // Vendor-filtered ready items
    const vendorReadyItems = readyItems.filter(i => i.vendorId === selectedVendorId);

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        try {
            const [plansRes, vendorsRes, customersRes] = await Promise.all([
                apiClient.get('/dispatch/plans'),
                apiClient.get('/vendors?limit=100'),
                apiClient.get('/customers'),
            ]);
            setPlans(plansRes.data.data || []);
            setVendors(vendorsRes.data.data || vendorsRes.data || []);
            setCustomers(customersRes.data.data || customersRes.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const fetchReadyItems = useCallback(async (vendorId: string) => {
        if (!vendorId) { setReadyItems([]); return; }
        try {
            const res = await apiClient.get('/jobs/ready-for-dispatch', { params: { vendorId } });
            setReadyItems(res.data.data || res.data || []);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { fetchReadyItems(selectedVendorId); setSelectedItems({}); }, [selectedVendorId, fetchReadyItems]);

    const toggleItem = (challanItemId: string, maxQty: number) => {
        setSelectedItems(prev => {
            if (prev[challanItemId] !== undefined) {
                const { [challanItemId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [challanItemId]: maxQty };
        });
    };

    const handleCreatePlan = async () => {
        if (!selectedVendorId || !selectedCustomerId) { toast.error('Select vendor and customer'); return; }
        if (!plannedDate) { toast.error('Set a planned date'); return; }
        if (Object.keys(selectedItems).length === 0) { toast.error('Select at least one item'); return; }

        const itemsPayload = Object.entries(selectedItems).map(([challanItemId, quantityDispatched]) => ({
            challanItemId,
            quantityDispatched,
        }));

        setCreating(true);
        try {
            await apiClient.post('/dispatch/plans', {
                vendorId: selectedVendorId,
                customerId: selectedCustomerId,
                plannedDate,
                vehicleNumber: vehicleNumber || undefined,
                driverName: driverName || undefined,
                driverPhone: driverPhone || undefined,
                notes: notes || undefined,
                items: itemsPayload,
            });
            toast.success('Dispatch plan created!');
            setShowCreateForm(false);
            setSelectedVendorId('');
            setSelectedCustomerId('');
            setSelectedItems({});
            setVehicleNumber('');
            setDriverName('');
            setDriverPhone('');
            setNotes('');
            fetchAll(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create plan');
        } finally {
            setCreating(false);
        }
    };

    const handleConfirm = async (planId: string) => {
        setConfirming(planId);
        try {
            await apiClient.post(`/dispatch/plans/${planId}/confirm`);
            toast.success('Dispatch confirmed — marked as In Transit');
            fetchAll(true);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Confirmation failed');
        } finally {
            setConfirming(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Loading dispatch data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-blue-500/20 rounded-xl"><Truck className="w-7 h-7 text-blue-400" /></span>
                            Dispatch Planning
                        </h1>
                        <p className="text-slate-400 mt-1">Plan and confirm material pickups from vendors</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => fetchAll(true)}
                            disabled={refreshing}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {showCreateForm ? 'Cancel' : 'New Dispatch Plan'}
                        </Button>
                    </div>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <Card className="bg-slate-900 border-slate-700 shadow-xl">
                        <CardHeader className="border-b border-slate-800">
                            <CardTitle className="text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-400" />
                                Create New Dispatch Plan
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Step 1 - Vendor & Customer */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Step 1: Select Vendor & Customer</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-400 mb-1 block">Vendor *</label>
                                        <select
                                            value={selectedVendorId}
                                            onChange={e => setSelectedVendorId(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">— Select Vendor —</option>
                                            {vendors.map((v: any) => (
                                                <option key={v.id} value={v.id}>{v.companyName} ({v.vendorCode})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 mb-1 block">Customer (Ship To) *</label>
                                        <select
                                            value={selectedCustomerId}
                                            onChange={e => setSelectedCustomerId(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                                        >
                                            <option value="">— Select Customer —</option>
                                            {customers.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.companyName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 - Select Items */}
                            {selectedVendorId && (
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Step 2: Select Items Ready for Dispatch</h3>
                                    {vendorReadyItems.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                                            <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                                            <p className="text-slate-500">No items ready for dispatch from this vendor</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {vendorReadyItems.map(item => {
                                                const isSelected = selectedItems[item.challanItemId] !== undefined;
                                                return (
                                                    <div
                                                        key={item.challanItemId}
                                                        className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-900/30 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
                                                        onClick={() => toggleItem(item.challanItemId, item.quantityReady)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'}`}>
                                                                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-mono font-semibold text-white">{item.partNumber}</p>
                                                                <p className="text-sm text-slate-400">{item.partDescription || 'No description'} · Challan: {item.challanNumber}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-sm text-slate-400">Available</p>
                                                                <p className="font-bold text-green-400">{item.quantityReady} pcs</p>
                                                            </div>
                                                            {isSelected && (
                                                                <div onClick={e => e.stopPropagation()}>
                                                                    <label className="text-xs text-slate-500 block mb-1">Dispatch Qty</label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={item.quantityReady}
                                                                        value={selectedItems[item.challanItemId]}
                                                                        onChange={e => setSelectedItems(prev => ({ ...prev, [item.challanItemId]: parseInt(e.target.value) || 0 }))}
                                                                        className="w-20 bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm text-center"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 3 - Transport & Logistics */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Step 3: Transport Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Planned Date *</label>
                                        <Input
                                            type="date"
                                            value={plannedDate}
                                            onChange={e => setPlannedDate(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 mb-1 flex items-center gap-1"><Car className="w-3 h-3" /> Vehicle Number</label>
                                        <Input
                                            placeholder="MH12AB1234"
                                            value={vehicleNumber}
                                            onChange={e => setVehicleNumber(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Driver Name</label>
                                        <Input
                                            placeholder="Driver name"
                                            value={driverName}
                                            onChange={e => setDriverName(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-400 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Driver Phone</label>
                                        <Input
                                            placeholder="+91 9876543210"
                                            value={driverPhone}
                                            onChange={e => setDriverPhone(e.target.value)}
                                            className="bg-slate-800 border-slate-700 text-white"
                                        />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="text-sm text-slate-400 mb-1 block">Notes (optional)</label>
                                    <textarea
                                        placeholder="Additional instructions for driver or warehouse..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Summary & Submit */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                                <p className="text-slate-400 text-sm">
                                    {Object.keys(selectedItems).length} item(s) selected ·{' '}
                                    {Object.values(selectedItems).reduce((s, q) => s + q, 0)} pcs total
                                </p>
                                <Button
                                    onClick={handleCreatePlan}
                                    disabled={creating}
                                    className="bg-blue-600 hover:bg-blue-500 text-white min-w-[160px]"
                                >
                                    {creating ? 'Creating...' : 'Create Dispatch Plan'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Existing Plans */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Dispatch Plans
                    </h2>

                    {plans.length === 0 ? (
                        <div className="text-center py-16 bg-slate-900 rounded-xl border border-dashed border-slate-700">
                            <Truck className="w-14 h-14 mx-auto text-slate-700 mb-3" />
                            <h3 className="text-white font-medium mb-1">No Dispatch Plans Yet</h3>
                            <p className="text-slate-500">Create your first plan using the button above.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {plans.map(plan => {
                                const cfg = statusConfig[plan.status] || statusConfig.planned;
                                const StatusIcon = cfg.icon;
                                return (
                                    <Card key={plan.id} className="bg-slate-900 border-slate-700 hover:border-slate-600 transition-all">
                                        <CardContent className="p-5">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-slate-800 rounded-xl">
                                                        <StatusIcon className="w-6 h-6 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <p className="font-bold text-white">{plan.vendor.companyName}</p>
                                                            <span className="text-slate-600">→</span>
                                                            <p className="text-slate-300">{plan.customer.companyName}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(plan.plannedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Package className="w-3 h-3" />
                                                                {plan._count.items} item(s)
                                                            </span>
                                                            {plan.vehicleNumber && (
                                                                <span className="flex items-center gap-1">
                                                                    <Car className="w-3 h-3" />
                                                                    {plan.vehicleNumber}
                                                                </span>
                                                            )}
                                                            {plan.driverName && (
                                                                <span className="flex items-center gap-1">
                                                                    <User className="w-3 h-3" />
                                                                    {plan.driverName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className={cfg.color}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {cfg.label}
                                                    </Badge>

                                                    {plan.status === 'planned' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleConfirm(plan.id)}
                                                            disabled={confirming === plan.id}
                                                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs"
                                                        >
                                                            {confirming === plan.id ? 'Confirming...' : '🚛 Confirm Dispatch'}
                                                        </Button>
                                                    )}

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => router.push(`/dashboard/challans/dispatch/${plan.id}`)}
                                                        className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                                                    >
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
