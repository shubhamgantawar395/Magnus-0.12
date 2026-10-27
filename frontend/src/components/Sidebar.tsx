'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
    LayoutDashboard,
    Users,
    Package,
    ClipboardCheck,
    Truck,
    Settings,
    FileText,
    LogOut,
    ShieldCheck,
    BarChart3,
    BarChart2,
    Server,
    Activity,
    ShoppingCart,
    ArrowDownToLine,
    ClipboardList,
    Wallet,
    ShieldAlert,
    Briefcase,
    PackageCheck,
    UserCheck,
    ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this utility exists, if not I'll remove cn usage

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const isActive = useCallback((path: string) => pathname?.startsWith(path), [pathname]);

    const menuItems = [
        {
            title: 'Dashboard',
            href: '/dashboard/admin',
            icon: LayoutDashboard,
            roles: ['platform_admin', 'admin', 'gm', 'plant_head', 'ppc_manager', 'production_manager', 'quality_head', 'customer', 'security', 'accounts_manager', 'store_keeper']
        },
        {
            title: 'Executive',
            href: '/dashboard/executive',
            icon: BarChart3,
            roles: ['platform_admin', 'executive', 'director', 'gm', 'admin', 'customer']
        },
        {
            title: 'Quality',
            href: '/dashboard/quality',
            icon: ShieldCheck,
            roles: ['platform_admin', 'quality_head', 'production_manager', 'executive', 'admin', 'customer']
        },
        {
            title: 'Customers & Parts',
            href: '/dashboard/customers',
            icon: Users,
            roles: ['all']
        },
        {
            title: 'Challans',
            href: '/dashboard/challans',
            icon: FileText,
            roles: ['platform_admin', 'ppc_manager', 'production_manager', 'gm', 'admin', 'customer']
        },
        {
            title: 'Dispatch Plans',
            href: '/dashboard/challans/dispatch',
            icon: Truck,
            roles: ['platform_admin', 'ppc_manager', 'production_manager', 'gm', 'admin', 'customer']
        },
        {
            title: 'Dispatch Tracker',
            href: '/dashboard/dispatch-tracker',
            icon: ClipboardCheck,
            roles: ['platform_admin', 'ppc_manager', 'production_manager', 'gm', 'admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc']
        },
        {
            title: 'Stock Statements',
            href: '/dashboard/stock-statements',
            icon: BarChart2,
            roles: ['platform_admin', 'ppc_manager', 'production_manager', 'director', 'gm', 'executive', 'admin']
        },
        {
            title: 'Supplier GRN',
            href: '/dashboard/supplier-grn',
            icon: ArrowDownToLine,
            roles: ['platform_admin', 'admin', 'gm', 'plant_head', 'production_manager', 'ppc_manager', 'store_keeper', 'accounts_manager']
        },
        {
            title: 'Line Deadlines',
            href: '/dashboard/line-deadlines',
            icon: ClipboardList,
            roles: ['platform_admin', 'admin', 'director', 'gm', 'executive', 'production_manager', 'ppc_manager', 'plant_head']
        },
        {
            title: 'My Jobs',
            href: '/dashboard/vendor/jobs',
            icon: Briefcase,
            roles: ['vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor']
        },
        {
            title: 'Stock',
            href: '/dashboard/stock',
            icon: Package,
            roles: ['vendor', 'vendor_user', 'vendor_owner']
        },
        {
            title: 'Sourcing',
            href: '/dashboard/executive/sourcing',
            icon: BarChart3,
            roles: ['platform_admin', 'gm', 'admin']
        },
        {
            title: 'Machines',
            href: '/dashboard/machines',
            icon: Server,
            roles: ['platform_admin', 'admin', 'plant_head', 'production_manager', 'director', 'gm']
        },
        {
            title: 'Part Dev',
            href: '/dashboard/part-developments',
            icon: Activity,
            roles: ['platform_admin', 'admin', 'gm', 'director', 'quality_head', 'ppc_manager']
        },
        {
            title: 'Customer Orders',
            href: '/dashboard/customer-orders',
            icon: ShoppingCart,
            roles: ['platform_admin', 'admin', 'gm', 'director', 'customer']
        },
        {
            title: 'Gate Receipts',
            href: '/dashboard/gate-receipts',
            icon: PackageCheck,
            roles: ['security', 'admin', 'gm']
        },
        {
            title: 'Gate Pass',
            href: '/dashboard/gate-pass',
            icon: UserCheck,
            roles: ['security', 'admin', 'gm', 'director']
        },
        {
            title: 'Vendor Invoices',
            href: '/dashboard/admin/invoices',
            icon: ReceiptText,
            roles: ['platform_admin', 'admin', 'gm', 'ppc_manager']
        },
        {
            title: 'Vendor Ledger',
            href: '/dashboard/vendor-ledger',
            icon: Wallet,
            roles: ['platform_admin', 'admin', 'gm', 'director', 'accounts_manager', 'vendor', 'vendor_owner']
        },
        {
            title: 'Users',
            href: '/users',
            icon: Users,
            roles: ['platform_admin', 'admin', 'customer', 'vendor_owner']
        },
        {
            title: 'Platform Admin',
            href: '/super-admin',
            icon: ShieldAlert,
            roles: ['platform_admin']
        }
    ];

    const filteredMenu = useMemo(() =>
        menuItems.filter(item =>
            item.roles.includes('all') || (user && item.roles.includes(user.role))
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user?.role]
    );

    return (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col h-screen fixed left-0 top-0 z-40">
            {/* Logo */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">A</span>
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Aaniry VMS</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredMenu.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive(item.href)
                                ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.title}
                    </Link>
                ))}
            </nav>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                        {user?.firstName?.[0] || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        logout();
                        router.push('/login');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
