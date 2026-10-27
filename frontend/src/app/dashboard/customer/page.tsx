'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import {
    BarChart3,
    Package,
    TruckIcon,
    AlertTriangle,
    Plus,
    LogOut,
    Users,
    Search,
    ChevronRight,
    Filter
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CustomerDashboard() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState({
        totalChallans: 0,
        inProcess: 0,
        ready: 0,
        overdue: 0
    });
    const [challans, setChallans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'customer') {
            router.push('/login');
            return;
        }

        fetchDashboardData();
    }, [user, router]);

    const fetchDashboardData = async () => {
        try {
            const [challansRes] = await Promise.all([
                apiClient.get('/challans?limit=5')
            ]);

            setChallans(challansRes.data.data || []);

            // Calculate stats from challans (in a real app, this would be a dedicated stats endpoint)
            const total = challansRes.data.pagination?.total || 0;
            setStats({
                totalChallans: total,
                inProcess: challansRes.data.data?.filter((c: any) => c.status === 'in_process').length || 0,
                ready: challansRes.data.data?.filter((c: any) => c.status === 'completed').length || 0,
                overdue: 0
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Aaniry VMS</h1>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <p className="text-xs text-slate-400 font-medium">Customer Portal</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-semibold text-white">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">
                                {user?.email}
                            </p>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="text-slate-400 hover:text-white hover:bg-white/5"
                        >
                            <LogOut className="w-5 h-5 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 w-full">

                {/* Welcome Section */}
                <div className="mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
                    <p className="text-slate-400">Track production, manage vendors, and oversee dispatch plans.</p>
                </div>

                {/* Quick Actions Grid - Highlighting New Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <Link href="/challans/new" className="group">
                        <div className="h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl shadow-blue-900/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-600/30">
                            <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                                <Plus className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Create New Challan</h3>
                            <p className="text-blue-100/80 text-sm mb-4">Issue new job work orders to your vendors with material tracking.</p>
                            <div className="flex items-center text-white/90 text-sm font-medium">
                                Start Now <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/dispatch-tracker" className="group">
                        <div className="h-full bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/50 group-hover:shadow-lg group-hover:shadow-blue-500/10">
                            <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                                <Search className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="flex items-start justify-between">
                                <h3 className="text-lg font-bold text-white mb-2">Dispatch Tracker</h3>
                                <div className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">New</div>
                            </div>
                            <p className="text-slate-400 text-sm mb-4">Query jobs ready for dispatch by part number across all vendors.</p>
                            <div className="flex items-center text-emerald-400 text-sm font-medium">
                                Track Parts <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>

                    <Link href="/dashboard/vendors/new" className="group">
                        <div className="h-full bg-slate-800/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/50 group-hover:shadow-lg group-hover:shadow-violet-500/10">
                            <div className="bg-violet-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                                <Users className="w-6 h-6 text-violet-400" />
                            </div>
                            <div className="flex items-start justify-between">
                                <h3 className="text-lg font-bold text-white mb-2">Add Vendor</h3>
                                <div className="px-2 py-1 rounded bg-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-wider">New</div>
                            </div>
                            <p className="text-slate-400 text-sm mb-4">Register new vendors to your network and manage their access.</p>
                            <div className="flex items-center text-violet-400 text-sm font-medium">
                                Manage Network <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-slate-400">Total Challans</p>
                                <Package className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats.totalChallans}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-slate-400">In Process</p>
                                <BarChart3 className="w-5 h-5 text-orange-500" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats.inProcess}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-slate-400">Ready</p>
                                <TruckIcon className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats.ready}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-white/5 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-medium text-slate-400">Overdue</p>
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                            </div>
                            <p className="text-3xl font-bold text-white">{stats.overdue}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Challans */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">Recent Challans</h2>
                        <Button variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">
                            View All
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-950/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Challan #</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {challans.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            No challans found. Create your first challan to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    challans.map((challan: any) => (
                                        <tr key={challan.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link href={`/challans/${challan.id}`} className="text-sm font-mono font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                                    {challan.challanNumber}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                {challan.vendor?.companyName || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                {new Date(challan.challanDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                {challan.totalQuantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${challan.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    challan.status === 'in_process' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    }`}>
                                                    {challan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
