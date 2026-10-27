'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/user';
import { apiClient } from '@/lib/api-client';
import {
    Users,
    Factory,
    FileText,
    Truck,
    Settings,
    LogOut,
    CheckSquare,
    TrendingUp,
    ShoppingCart,
    Package,
    Brain,
    Activity,
    ArrowUpRight
} from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalVendors: 0,
        activeChallans: 0,
        pendingApprovals: 0,
        openJobs: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const allowedRoles: (string | UserRole)[] = [
            UserRole.PLATFORM_ADMIN,
            'admin',
            UserRole.DIRECTOR,
            UserRole.GM,
            UserRole.STORE_KEEPER,
            UserRole.PRODUCTION_MANAGER,
            UserRole.PPC_MANAGER,
            'ppc_manager',
            'executive'
        ];

        if (!user) {
            router.push('/login');
            return;
        }

        if (!allowedRoles.includes(user.role as any) && (user.role as string) !== 'admin') {
            // Redirect non-admin roles to their own landing page
            if (user.role === 'security') {
                router.replace('/dashboard/gate-receipts');
            } else if (['vendor', 'vendor_user', 'vendor_owner', 'vendor_ppc', 'vendor_supervisor'].includes(user.role)) {
                router.replace('/dashboard/vendor');
            } else {
                router.replace('/login');
            }
            return;
        }

        fetchDashboardData();
    }, [user, router]);

    const fetchDashboardData = async () => {
        try {
            const [customersRes, vendorsRes, challansRes, posRes, jobsRes] = await Promise.all([
                apiClient.get('/customers?limit=1'),
                apiClient.get('/vendors?limit=1'),
                apiClient.get('/challans?limit=1&status=issued'),
                apiClient.get('/purchase-orders?status=pending_approval'),
                apiClient.get('/jobs?limit=1')
            ]);

            setStats({
                totalCustomers: customersRes.data.pagination?.total || 0,
                totalVendors: vendorsRes.data.pagination?.total || 0,
                activeChallans: challansRes.data.pagination?.total || 0,
                pendingApprovals: Array.isArray(posRes.data) ? posRes.data.length : (posRes.data.pagination?.total || 0),
                openJobs: jobsRes.data.pagination?.total || 0
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
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Synchronizing Control Center...</p>
                </div>
            </div>
        );
    }

    const menuItems = [
        { title: 'Customers', icon: Users, href: '/dashboard/customers', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', description: 'Manage OEM profiles & parts' },
        { title: 'Vendors', icon: Factory, href: '/dashboard/vendors', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', description: 'Manage supplier network' },
        { title: 'Purchase Orders', icon: ShoppingCart, href: '/dashboard/customer-orders', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', description: 'Manage POs & fulfillment' },
        { title: 'Challans', icon: FileText, href: '/dashboard/challans', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', description: 'Track material logistics' },
        { title: 'Machines', icon: Settings, href: '/dashboard/machines', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', description: 'Fleet telemetry & monitoring' },
        { title: 'Dispatch Tracker', icon: Truck, href: '/dashboard/dispatch-tracker', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', description: 'Plan & track shipments' },
        { title: 'Part Development', icon: Brain, href: '/dashboard/part-developments', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', description: 'NPI Pipeline & FAI tracking' },
        { title: 'JARVIS Knowledge', icon: Brain, href: '/dashboard/admin/knowledge-center', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', description: 'Train operational AI' },
        { title: 'System Settings', icon: Settings, href: '/dashboard/admin/settings', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-800', description: 'Plant configuration' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Header */}
            <header className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Settings className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight uppercase">Magnus <span className="text-indigo-500">v2.0</span></h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Administrative Control Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-white">{user?.firstName} {user?.lastName}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl transition-all border border-slate-700"
                        >
                            <LogOut className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
                
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Users className="w-5 h-5 text-indigo-400" />
                            </div>
                            <Activity className="w-4 h-4 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <p className="text-4xl font-black text-white tracking-tight">{stats.totalCustomers}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Total Customers</p>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-white/5 hover:border-orange-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Factory className="w-5 h-5 text-orange-400" />
                            </div>
                            <Activity className="w-4 h-4 text-slate-700 group-hover:text-orange-500 transition-colors" />
                        </div>
                        <p className="text-4xl font-black text-white tracking-tight">{stats.totalVendors}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Network Vendors</p>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-sm rounded-3xl p-6 border border-white/5 hover:border-emerald-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <FileText className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">LIVE</span>
                        </div>
                        <p className="text-4xl font-black text-white tracking-tight">{stats.activeChallans}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Active Challans</p>
                    </div>

                    <Link href="/dashboard/customer-orders?status=pending_approval" className="bg-slate-900 border-2 border-indigo-500/20 backdrop-blur-sm rounded-3xl p-6 hover:border-indigo-500 transition-all shadow-xl shadow-indigo-500/5 group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <CheckSquare className="w-5 h-5 text-indigo-400" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <p className="text-4xl font-black text-white tracking-tight">{stats.pendingApprovals}</p>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">Pending Approvals</p>
                    </Link>
                </div>

                {/* JARVIS Knowledge Integration */}
                <div className="bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-transparent border border-indigo-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center shrink-0 shadow-2xl">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Operational Intelligence Training</h2>
                        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                            Upgrade J.A.R.V.I.S. with business rules, vendor profiles, and lead-time benchmarks.
                            Operational intelligence scales with the depth of your Knowledge Center.
                        </p>
                    </div>
                    <Link href="/dashboard/admin/knowledge-center" className="ml-auto w-full md:w-auto px-6 py-3 bg-white text-indigo-900 font-bold rounded-2xl hover:bg-indigo-50 transition-all text-center">
                        Open Knowledge Center
                    </Link>
                </div>

                {/* Module Navigation Grid */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        <h2 className="text-xl font-bold text-white tracking-tight">System Modules</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {menuItems.map((item) => (
                            <Link
                                key={item.title}
                                href={item.href}
                                className="group bg-slate-900/40 backdrop-blur-sm rounded-3xl p-8 border border-white/5 hover:border-indigo-500/40 hover:bg-slate-900/80 transition-all duration-300 relative overflow-hidden"
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 ${item.bg} opacity-10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`} />
                                <div className="flex items-start gap-6 relative z-10">
                                    <div className={`p-4 rounded-2xl ${item.bg} transition-colors duration-300 group-hover:bg-white`}>
                                        <item.icon className={`w-8 h-8 ${item.color} group-hover:text-black transition-colors duration-300`} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-xl mb-2 group-hover:text-indigo-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                    Access Module <ArrowUpRight className="w-3 h-3" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
