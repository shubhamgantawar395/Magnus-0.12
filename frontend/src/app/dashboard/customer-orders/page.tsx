'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { customerOrderService } from '@/services/customer-order-service';
import { CustomerOrder, CustomerOrderStatus } from '@/types/customer-order';
import { ShoppingCart, Clock, CheckCircle2, AlertTriangle, Search, Filter, Plus, Loader2, DollarSign, Package, ChevronRight, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<CustomerOrderStatus, { label: string; color: string }> = {
    active: { label: 'ACTIVE', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    completed: { label: 'COMPLETED', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    cancelled: { label: 'CANCELLED', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    on_hold: { label: 'ON HOLD', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
};

export default function CustomerOrdersPage() {
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = async () => {
        try {
            const data = await customerOrderService.getAll();
            setOrders(data);
        } catch (error) {
            toast.error('Failed to sync master orders');
            // Fallback to demo data
            setOrders([
                {
                    id: '1',
                    orderNumber: 'PO-2026-001',
                    customerPoRef: 'CUST/9920',
                    orderDate: '2026-04-10',
                    deliveryDate: '2026-05-15',
                    status: 'active',
                    customer: { id: 'c1', companyName: 'TATA Motors Ltd' },
                    items: [
                        { id: 'i1', orderId: '1', partNumber: 'PN-662', quantity: 1000, deliveredQty: 450, pendingQty: 550, createdAt: '', updatedAt: '' },
                        { id: 'i2', orderId: '1', partNumber: 'PN-901', quantity: 500, deliveredQty: 500, pendingQty: 0, createdAt: '', updatedAt: '' },
                    ],
                    organizationId: '',
                    createdAt: '',
                    updatedAt: ''
                },
                {
                    id: '2',
                    orderNumber: 'PO-2026-005',
                    customerPoRef: 'CUST/1021',
                    orderDate: '2026-04-12',
                    deliveryDate: '2026-04-30',
                    status: 'on_hold',
                    customer: { id: 'c2', companyName: 'Mahindra & Mahindra' },
                    items: [
                        { id: 'i3', orderId: '2', partNumber: 'PN-112', quantity: 200, deliveredQty: 0, pendingQty: 200, createdAt: '', updatedAt: '' },
                    ],
                    organizationId: '',
                    createdAt: '',
                    updatedAt: ''
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const filtered = orders.filter(o => 
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.customer?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const stats = {
        totalValue: orders.reduce((acc, o) => acc + (o.items?.reduce((s, i) => s + (i.quantity * (i.unitPrice || 0)), 0) || 0), 0),
        activeCount: orders.filter(o => o.status === 'active').length,
        delayedCount: orders.filter(o => o.deliveryDate && new Date(o.deliveryDate) < new Date() && o.status !== 'completed').length,
    };

    return (
        <div className="p-6 space-y-8 bg-slate-950 min-h-screen text-slate-200">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-indigo-500" />
                        Customer Order Management
                    </h1>
                    <p className="text-slate-400 mt-1">Magnus v2.0 · Fulfillment tracking & order master</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-lg shadow-indigo-500/20">
                        <Plus className="w-4 h-4" />
                        Capture Order
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Open Order Value</CardTitle>
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">₹{(stats.totalValue / 100000).toFixed(1)}L</div>
                        <p className="text-xs text-slate-500 mt-1">Unfulfilled commitments</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Active Orders</CardTitle>
                        <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.activeCount}</div>
                        <p className="text-xs text-slate-500 mt-1">Currently in production</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Items Pending</CardTitle>
                        <Package className="w-4 h-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">
                            {orders.reduce((acc, o) => acc + (o.items?.length || 0), 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Unique line items</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 shadow-xl border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-400">Delayed Items</CardTitle>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-500">{stats.delayedCount}</div>
                        <p className="text-xs text-slate-500 mt-1">Past delivery schedule</p>
                    </CardContent>
                </Card>
            </div>

            {/* List Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Search Order # or Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Order No / Customer</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Date / Schedule</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Fulfillment Status</th>
                                <th className="p-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filtered.map((order) => {
                                const status = STATUS_CONFIG[order.status];
                                const totalQty = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
                                const delQty = order.items?.reduce((s, i) => s + i.deliveredQty, 0) || 0;
                                const progress = totalQty > 0 ? (delQty / totalQty) * 100 : 0;

                                return (
                                    <tr key={order.id} className="group hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 border-l-2 border-l-transparent group-hover:border-l-indigo-500">
                                            <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {order.orderNumber}
                                            </div>
                                            <div className="text-xs text-slate-500 uppercase">{order.customer?.companyName}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
                                                <Clock className="w-3 h-3" /> Ordered: {new Date(order.orderDate).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Schedule: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className={`px-2 py-0.5 rounded-md text-[10px] border ${status.color}`}>
                                                    {status.label}
                                                </Badge>
                                                <span className="text-xs text-slate-500 font-medium">{Math.round(progress)}% Shipped</span>
                                            </div>
                                            <div className="w-48 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                                <div 
                                                    className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000" 
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-400 transition-colors">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-between items-center">
                    <div className="text-xs text-slate-600">Showing {filtered.length} of {orders.length} master orders</div>
                    <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        View Historical Data <BarChart3 className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
