'use client';

import { useState, useEffect, memo } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { useAuthStore } from '@/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { AiAssistant as _AiAssistant } from '@/components/AiAssistant';
import { UserRole } from '@/types/user';

// Memoize so sidebar-toggle re-renders don't cascade into the AI assistant
const AiAssistant = memo(_AiAssistant);

const VENDOR_ROLES = [
    UserRole.VENDOR_OWNER,
    UserRole.VENDOR_PPC,
    UserRole.VENDOR_SUPERVISOR,
    UserRole.VENDOR_USER,
    UserRole.VENDOR,
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const { user, isAuthenticated } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    // Wait for Zustand to rehydrate from localStorage before running guards
    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (!hasMounted) return;

        // Not authenticated — send to login
        if (!isAuthenticated || !user) {
            router.replace('/login');
            return;
        }

        // Platform admin should never be in the regular dashboard
        if (user.role === UserRole.PLATFORM_ADMIN) {
            router.replace('/super-admin');
            return;
        }

        // Vendor roles are only allowed under /dashboard/vendor
        if (VENDOR_ROLES.includes(user.role as UserRole)) {
            if (!pathname?.startsWith('/dashboard/vendor')) {
                router.replace('/dashboard/vendor');
            }
            return;
        }
    }, [isAuthenticated, user, router, pathname, hasMounted]);

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Sidebar (Desktop) */}
            <Sidebar />

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar (Drawer) */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
                <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-6 md:p-8 bg-slate-950 overflow-y-auto relative">
                    {children}
                    {user?.role !== 'security' && <AiAssistant />}
                </main>
            </div>
        </div>
    );
}
