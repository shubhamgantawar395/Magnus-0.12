'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { FileText, List, ShoppingCart, ClipboardCheck, AlertCircle, Briefcase, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { JarvisWidget } from '@/components/JarvisWidget';

interface JobProcess {
    id: string;
    processName: string;
    processSequence: number;
    status: 'pending' | 'in_progress' | 'completed';
    targetQuantity: number;
    completedQuantity: number;
    rejectedQuantity: number;
    reworkQuantity: number;
}

interface ChallanItem {
    id: string;
    partNumber: string;
    partDescription: string | null;
    quantityIssued: number;
    unitOfMeasure: string | null;
    jobProcesses: JobProcess[];
}

interface Challan {
    id: string;
    challanNumber: string;
    challanDate: string;
    customer: {
        companyName: string;
    };
    items: ChallanItem[];
}

interface PurchaseOrder {
    id: string;
    poNumber: string;
    poDate: string;
    status: string;
    totalAmount: number;
    jobWorkType: string;
    deliveryDate?: string;
}

interface StockStatement {
    id: string;
    statementNumber: string;
    periodFrom: string;
    periodTo: string;
    status: string;
    statementDate: string;
}

interface UpdateModalData {
    processId: string;
    processName: string;
    partNumber: string;
    targetQuantity: number;
    completedQuantity: number;
}

export default function VendorDashboard() {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const [hasMounted, setHasMounted] = useState(false);
    const [challans, setChallans] = useState<Challan[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [stockStatements, setStockStatements] = useState<StockStatement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateData, setUpdateData] = useState<UpdateModalData | null>(null);
    const [updateForm, setUpdateForm] = useState({
        completed: 0,
        rejected: 0,
        rework: 0,
        remarks: ''
    });
    const [dispatchSummary, setDispatchSummary] = useState<any[]>([]);

    // KPI calculations
    const totalJobs = challans.length;
    const jobsInProgress = challans.filter(c =>
        c.items.some(item => item.jobProcesses.some(p => p.status === 'in_progress'))
    ).length;
    const jobsReady = challans.filter(c =>
        c.items.every(item => item.jobProcesses.every(p => p.status === 'completed'))
    ).length;
    const monthlyProduction = challans.reduce((sum, c) =>
        sum + c.items.reduce((itemSum, item) =>
            itemSum + item.jobProcesses.reduce((processSum, p) =>
                processSum + (p.status === 'completed' ? p.completedQuantity : 0), 0
            ), 0
        ), 0
    );

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;
        if (!user || (!user.role.startsWith('vendor') && user.role !== 'vendor')) {
            router.push('/login');
            return;
        }
        fetchDashboardData();
    }, [user, router, hasMounted]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchVendorJobs(),
                fetchPurchaseOrders(),
                fetchStockStatements()
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVendorJobs = async () => {
        try {
            const res = await apiClient.get('/vendors/jobs');
            setChallans(res.data.data || []);

            const dispatchRes = await apiClient.get('/vendors/me/dispatch-summary');
            setDispatchSummary(dispatchRes.data || []);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        }
    };

    const fetchPurchaseOrders = async () => {
        try {
            const res = await apiClient.get('/purchase-orders', { params: { status: 'approved' } });
            // Filter to show only active ones if needed, or just show latest 5
            setPurchaseOrders(res.data.slice(0, 5) || []);
        } catch (error) {
            console.error('Failed to fetch purchase orders:', error);
        }
    };

    const fetchStockStatements = async () => {
        try {
            const res = await apiClient.get('/stock-statements');
            setStockStatements(res.data.slice(0, 5) || []);
        } catch (error) {
            console.error('Failed to fetch stock statements:', error);
        }
    };

    const openUpdateModal = (process: JobProcess, item: ChallanItem) => {
        setUpdateData({
            processId: process.id,
            processName: process.processName,
            partNumber: item.partNumber,
            targetQuantity: process.targetQuantity,
            completedQuantity: process.completedQuantity
        });
        setUpdateForm({
            completed: 0,
            rejected: 0,
            rework: 0,
            remarks: ''
        });
        setShowUpdateModal(true);
    };

    const handleUpdateProcess = async () => {
        if (!updateData) return;

        const total = updateForm.completed + updateForm.rejected + updateForm.rework;
        const remaining = updateData.targetQuantity - updateData.completedQuantity;

        if (total > remaining) {
            toast.error(`Total (${total}) exceeds remaining quantity (${remaining})`);
            return;
        }

        try {
            const res = await apiClient.post(`/jobs/processes/${updateData.processId}/update`, {
                quantityCompleted: updateForm.completed,
                quantityRejected: updateForm.rejected,
                quantityRework: updateForm.rework,
                remarks: updateForm.remarks
            });

            if (res.status === 200 || res.status === 201) {
                setShowUpdateModal(false);
                fetchVendorJobs(); // Refresh data
            }
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Failed to update process');
        }
    };

    const getProcessStatusIcon = (status: string) => {
        if (status === 'completed') return '✓';
        if (status === 'in_progress') return '⟳';
        return '○';
    };

    const getProcessStatusColor = (status: string) => {
        if (status === 'completed') return 'text-emerald-400';
        if (status === 'in_progress') return 'text-cyan-400';
        return 'text-slate-500';
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved': return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/50';
            case 'pending': return 'text-amber-400 bg-amber-950/30 border-amber-900/50';
            case 'rejected': return 'text-rose-400 bg-rose-950/30 border-rose-900/50';
            case 'draft': return 'text-slate-400 bg-slate-900/50 border-slate-700/50';
            default: return 'text-slate-400 bg-slate-900/50 border-slate-700/50';
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 flex items-center justify-center">
                <div className="text-white text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Vendor Dashboard</h1>
                        <p className="text-sm text-slate-400 mt-1">Manage your assigned jobs and update process status</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => router.push('/dashboard')}
                            variant="outline"
                            className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 text-slate-300 hover:bg-slate-800/80"
                        >
                            Dashboard
                        </Button>
                        <Button
                            onClick={() => router.push('/dashboard/vendor/settings')}
                            variant="outline"
                            className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 text-slate-300 hover:bg-slate-800/80"
                        >
                            Settings
                        </Button>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="bg-slate-900/50 backdrop-blur-sm border-slate-700/50 text-slate-300 hover:bg-slate-800/80"
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-lg shadow-indigo-950/30">
                        <div className="text-slate-400 text-sm font-medium mb-2">Jobs Received</div>
                        <div className="text-4xl font-bold text-white">{totalJobs}</div>
                    </Card>
                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-lg shadow-indigo-950/30">
                        <div className="text-slate-400 text-sm font-medium mb-2">In Progress</div>
                        <div className="text-4xl font-bold text-cyan-400">{jobsInProgress}</div>
                    </Card>
                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-lg shadow-indigo-950/30">
                        <div className="text-slate-400 text-sm font-medium mb-2">Ready</div>
                        <div className="text-4xl font-bold text-emerald-400">{jobsReady}</div>
                    </Card>
                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-lg shadow-indigo-950/30">
                        <div className="text-slate-400 text-sm font-medium mb-2">This Month</div>
                        <div className="text-4xl font-bold text-violet-400">{monthlyProduction}</div>
                        <div className="text-xs text-slate-500 mt-1">pcs completed</div>
                    </Card>
                </div>

                {/* JARVIS AI Assistant */}
                <div className="grid grid-cols-1 gap-6">
                    <JarvisWidget userName={user?.firstName || 'Vendor'} role="vendor" />
                </div>

                {/* Active POs and Stock Statements Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active POs */}
                    <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-amber-400" />
                                Active Purchase Orders
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-white"
                                onClick={() => router.push('/dashboard/vendor/orders')}
                            >
                                View All
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {purchaseOrders.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No active purchase orders found.</p>
                                </div>
                            ) : (
                                purchaseOrders.map(po => (
                                    <div key={po.id} className="flex justify-between items-center p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                                        <div>
                                            <div className="font-mono text-white text-sm">{po.poNumber}</div>
                                            <div className="text-xs text-slate-500">{new Date(po.poDate).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(po.status)} capitalize`}>
                                                {po.status}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>

                    {/* Stock Statements */}
                    <Card className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 p-6 h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                                Stock Statements
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-white"
                                onClick={() => router.push('/dashboard/vendor/stock-statement')}
                            >
                                View All
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {stockStatements.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No stock statements generated yet.</p>
                                    <Button
                                        variant="link"
                                        className="text-indigo-400 p-0 h-auto mt-2"
                                        onClick={() => router.push('/dashboard/vendor/stock-statement/create')}
                                    >
                                        Create New Statement
                                    </Button>
                                </div>
                            ) : (
                                stockStatements.map(stmt => (
                                    <div key={stmt.id} className="flex justify-between items-center p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                                        <div>
                                            <div className="font-mono text-white text-sm">{stmt.statementNumber}</div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(stmt.periodFrom).toLocaleDateString()} - {new Date(stmt.periodTo).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(stmt.status)} capitalize`}>
                                                {stmt.status}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* My Jobs — primary CTA */}
                    <Card className="bg-gradient-to-br from-indigo-600/40 to-violet-900/40 backdrop-blur-xl border border-indigo-500/30 p-6 flex flex-col justify-between group hover:border-indigo-500/50 transition-all">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <span className="p-2 bg-indigo-500/20 rounded-lg"><Briefcase className="w-5 h-5 text-indigo-400" /></span>
                                My Jobs
                            </h3>
                            <p className="text-slate-200 text-sm mb-4">
                                Track all assigned jobs, update process quantities, and view history.
                            </p>
                            <div className="flex gap-3 text-xs text-indigo-300">
                                <span className="bg-indigo-900/40 px-2 py-0.5 rounded-full border border-indigo-700/30">{jobsInProgress} in progress</span>
                                <span className="bg-violet-900/40 px-2 py-0.5 rounded-full border border-violet-700/30">{jobsReady} ready</span>
                            </div>
                        </div>
                        <div className="mt-4">
                            <Button
                                onClick={() => router.push('/dashboard/vendor/jobs')}
                                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-900/30"
                            >
                                Open My Jobs →
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-600/40 to-teal-900/40 backdrop-blur-xl border border-emerald-500/30 p-6 flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <span className="p-2 bg-emerald-500/20 rounded-lg"><FileText className="w-5 h-5 text-emerald-400" /></span>
                                Invoices
                            </h3>
                            <p className="text-slate-200 text-sm mb-4">Create and manage tax invoices for your completed challans.</p>
                        </div>
                        <div className="space-y-3">
                            <Button
                                onClick={() => router.push('/dashboard/vendor/invoices/create')}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/20"
                            >
                                Create New Invoice
                            </Button>
                            <Button
                                onClick={() => router.push('/dashboard/vendor/invoices')}
                                variant="outline"
                                className="w-full border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 hover:text-white"
                            >
                                View All Invoices
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-600/40 to-orange-900/40 backdrop-blur-xl border border-amber-500/30 p-6 flex flex-col justify-between group hover:border-amber-500/50 transition-all">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <span className="p-2 bg-amber-500/20 rounded-lg"><List className="w-5 h-5 text-amber-400" /></span>
                                Delivery Challans
                            </h3>
                            <p className="text-slate-200 text-sm mb-4">View past challans and track delivery history.</p>
                        </div>
                        <div className="mt-auto">
                            <Button
                                onClick={() => router.push('/dashboard/vendor/challans')}
                                variant="outline"
                                className="w-full border-amber-500/30 text-amber-200 hover:bg-amber-500/20 hover:text-white"
                            >
                                View All Challans
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Dispatch Ready Section */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                        <span className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-green-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"></span>
                        Ready for Dispatch
                    </h2>

                    {dispatchSummary.length === 0 ? (
                        <div className="bg-slate-900/50 border border-dashed border-emerald-900/50 rounded-xl p-8 text-center">
                            <div className="w-12 h-12 bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">🚛</span>
                            </div>
                            <h3 className="text-slate-300 font-medium mb-1">No items ready for dispatch</h3>
                            <p className="text-slate-500 text-sm">Completed jobs will automatically appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dispatchSummary.map((item, idx) => (
                                <Card key={idx} className="bg-emerald-950/20 backdrop-blur-xl border border-emerald-900/30 p-4 shadow-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-mono text-white font-bold text-lg">{item.partNumber}</div>
                                            <div className="text-xs text-emerald-400/70">{item.partDescription}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-emerald-400">{item.quantityReady}</div>
                                            <div className="text-xs text-emerald-500 uppercase font-semibold">Ready</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-emerald-900/30">
                                        <div className="text-xs text-slate-400 mb-1">Items:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {item.items.map((sub: any) => (
                                                <div key={sub.processId} className="flex justify-between items-center w-full text-xs">
                                                    <span className="text-slate-300 font-mono">{sub.challanNumber}</span>
                                                    <span className="text-emerald-300">{sub.quantity} qty</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Active Jobs */}
                <div>
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                        <span className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"></span>
                        Active Jobs
                    </h2>

                    {challans.length === 0 ? (
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-12 text-center">
                            <div className="text-slate-500 text-lg">No jobs assigned yet</div>
                            <p className="text-slate-600 text-sm mt-2">Jobs will appear here when the customer creates delivery challans for you</p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {challans.map(challan => (
                                <Card key={challan.id} className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6 shadow-lg shadow-indigo-950/20">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-sm text-slate-500 font-medium">Challan: <span className="text-cyan-400 font-mono">{challan.challanNumber}</span></div>
                                            <div className="text-sm text-slate-500">Customer: <span className="text-white">{challan.customer.companyName}</span></div>
                                            <div className="text-xs text-slate-600 mt-1">Date: {new Date(challan.challanDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    {/* Items and Processes */}
                                    <div className="space-y-4">
                                        {challan.items.map(item => (
                                            <div key={item.id} className="border-t border-slate-800 pt-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="font-mono text-white font-bold">{item.partNumber}</div>
                                                        <div className="text-sm text-slate-400">{item.partDescription}</div>
                                                        <div className="text-xs text-slate-500 mt-1">Quantity: {item.quantityIssued} {item.unitOfMeasure || 'NOS'}</div>
                                                    </div>
                                                </div>

                                                {/* Process Flow */}
                                                <div className="bg-slate-950/60 backdrop-blur-sm rounded-lg p-4 border border-slate-800">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {item.jobProcesses
                                                            .sort((a, b) => a.processSequence - b.processSequence)
                                                            .map((process, idx) => (
                                                                <div key={process.id} className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => process.status !== 'completed' && openUpdateModal(process, item)}
                                                                        className={`px-4 py-2 rounded-lg border transition-all ${process.status === 'completed'
                                                                            ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400 cursor-default'
                                                                            : process.status === 'in_progress'
                                                                                ? 'bg-cyan-950/30 border-cyan-900/50 text-cyan-400 hover:bg-cyan-900/40 cursor-pointer'
                                                                                : 'bg-slate-900/50 border-slate-700/50 text-slate-500 hover:bg-slate-800/50 cursor-pointer'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-lg ${getProcessStatusColor(process.status)}`}>
                                                                                {getProcessStatusIcon(process.status)}
                                                                            </span>
                                                                            <div className="text-left">
                                                                                <div className="font-medium text-sm">{process.processName}</div>
                                                                                <div className="text-xs opacity-75">
                                                                                    {process.completedQuantity}/{process.targetQuantity}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                    {idx < item.jobProcesses.length - 1 && (
                                                                        <span className="text-slate-600">→</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Update Process Modal */}
            {showUpdateModal && updateData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-6 max-w-md w-full shadow-2xl shadow-indigo-950/50">
                        <h3 className="text-xl font-bold text-white mb-4">Update Process: {updateData.processName}</h3>

                        <div className="space-y-4 mb-6">
                            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                                <div className="text-sm text-slate-500">Part: <span className="text-white font-mono">{updateData.partNumber}</span></div>
                                <div className="text-sm text-slate-500">Target: <span className="text-white">{updateData.targetQuantity}</span></div>
                                <div className="text-sm text-slate-500">Already Completed: <span className="text-cyan-400">{updateData.completedQuantity}</span></div>
                                <div className="text-sm text-slate-500">Remaining: <span className="text-amber-400">{updateData.targetQuantity - updateData.completedQuantity}</span></div>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Completed Quantity</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={updateForm.completed}
                                    onChange={(e) => setUpdateForm({ ...updateForm, completed: parseInt(e.target.value) || 0 })}
                                    className="bg-slate-950/80 border-slate-700 text-white focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Rejected Quantity</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={updateForm.rejected}
                                    onChange={(e) => setUpdateForm({ ...updateForm, rejected: parseInt(e.target.value) || 0 })}
                                    className="bg-slate-950/80 border-slate-700 text-white focus:border-rose-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Rework Quantity</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={updateForm.rework}
                                    onChange={(e) => setUpdateForm({ ...updateForm, rework: parseInt(e.target.value) || 0 })}
                                    className="bg-slate-950/80 border-slate-700 text-white focus:border-amber-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-400 uppercase mb-2 block">Remarks (Optional)</label>
                                <textarea
                                    value={updateForm.remarks}
                                    onChange={(e) => setUpdateForm({ ...updateForm, remarks: e.target.value })}
                                    className="w-full bg-slate-950/80 border border-slate-700 rounded-md p-3 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none"
                                    rows={3}
                                    placeholder="Any notes or observations..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowUpdateModal(false)}
                                variant="outline"
                                className="flex-1 bg-slate-900/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/80"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateProcess}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30"
                            >
                                Update Process
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
