'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
    LayoutDashboard,
    Building2,
    Truck,
    ScrollText,
    LogOut,
    Shield,
    ChevronLeft,
    Bell,
    Menu,
    X,
} from 'lucide-react';
import { platformService } from '@/services/platform-service';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/user';

const NAV_ITEMS = [
    { label: 'Overview', href: '/super-admin', icon: LayoutDashboard, exact: true },
    { label: 'Organizations', href: '/super-admin/organizations', icon: Building2 },
    { label: 'Vendor Queue', href: '/super-admin/vendors', icon: Truck, badge: true },
    { label: 'Audit Logs', href: '/super-admin/audit-logs', icon: ScrollText },
];

function PlatformSidebar({
    user,
    pathname,
    pendingCount,
    onLogout,
    onClose,
    mobile = false,
}: {
    user: any;
    pathname: string | null;
    pendingCount: number;
    onLogout: () => void;
    onClose?: () => void;
    mobile?: boolean;
}) {
    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.exact) return pathname === item.href;
        return pathname?.startsWith(item.href) ?? false;
    };

    return (
        <aside className={cn(
            "flex flex-col h-full bg-slate-950 border-r border-slate-800/60",
            mobile ? "w-72" : "w-64"
        )}>
            {/* Logo / Brand */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <Shield className="w-[18px] h-[18px] text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white tracking-tight">Aaniry Platform</p>
                        <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-widest">Admin Console</p>
                    </div>
                </div>
                {mobile && onClose && (
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Navigation</p>
                {NAV_ITEMS.map(item => {
                    const active = isActive(item);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                                active
                                    ? "bg-indigo-600/15 text-indigo-300 border border-indigo-600/25"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-indigo-400" : "")} />
                                {item.label}
                            </div>
                            {item.badge && pendingCount > 0 && (
                                <span className="text-[10px] font-bold bg-amber-500 text-slate-900 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                <div className="pt-4 mt-2">
                    <div className="border-t border-slate-800/60 pt-3">
                        <p className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">App</p>
                        <Link
                            href="/dashboard/admin"
                            onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back to App
                        </Link>
                    </div>
                </div>
            </nav>

            {/* User Footer */}
            <div className="px-3 py-4 border-t border-slate-800/60">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                        {user?.firstName?.[0] || 'A'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[11px] text-indigo-400 truncate">Platform Admin</p>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [pendingCount, setPendingCount] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    // Wait for Zustand to rehydrate from localStorage before running guards
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Role guard — only platform_admin may enter this section
    useEffect(() => {
        if (!hasMounted) return;
        if (!user) {
            router.replace('/login');
            return;
        }
        if (user.role !== UserRole.PLATFORM_ADMIN) {
            // Redirect vendor roles to their portal, everyone else to org dashboard
            const vendorRoles = [UserRole.VENDOR_OWNER, UserRole.VENDOR_PPC, UserRole.VENDOR_SUPERVISOR, UserRole.VENDOR_USER, UserRole.VENDOR];
            if (vendorRoles.includes(user.role as UserRole)) {
                router.replace('/dashboard/vendor');
            } else {
                router.replace('/dashboard/admin');
            }
        }
    }, [user, router, hasMounted]);

    useEffect(() => {
        platformService.getPendingVendors()
            .then(v => setPendingCount(v.length))
            .catch(() => {});
    }, []);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const breadcrumb = pathname === '/super-admin' ? 'Overview'
        : pathname?.split('/').pop()?.replace(/-/g, ' ') || '';

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-64">
                <PlatformSidebar
                    user={user}
                    pathname={pathname}
                    pendingCount={pendingCount}
                    onLogout={handleLogout}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative z-10 h-full">
                        <PlatformSidebar
                            user={user}
                            pathname={pathname}
                            pendingCount={pendingCount}
                            onLogout={handleLogout}
                            onClose={() => setMobileOpen(false)}
                            mobile
                        />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:ml-64 min-h-0">
                {/* Top Bar */}
                <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="md:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
                            <Shield className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-indigo-600 font-medium">Platform Console</span>
                            <span>/</span>
                            <span className="text-slate-600 capitalize">{breadcrumb}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                            <Link
                                href="/super-admin/vendors"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-medium hover:bg-amber-100 transition-colors"
                            >
                                <Bell className="w-3.5 h-3.5" />
                                {pendingCount} pending vendor{pendingCount > 1 ? 's' : ''}
                            </Link>
                        )}
                        <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {user?.firstName?.[0] || 'A'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
