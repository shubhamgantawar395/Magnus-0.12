'use client';

import NotificationCenter from '@/components/NotificationCenter';
import AuxStatusDropdown from '@/components/AuxStatusDropdown';
import { useAuthStore } from '@/store/auth-store';
import { Menu } from 'lucide-react';

export default function DashboardHeader({ onMenuClick }: { onMenuClick?: () => void }) {
    const { user } = useAuthStore();

    return (
        <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-slate-400 hover:text-white"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                    <h2 className="text-white font-semibold leading-none">
                        Dashboard
                    </h2>
                    <span className="text-xs text-slate-500 mt-1">
                        {user?.role?.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <AuxStatusDropdown />
                <NotificationCenter />
            </div>
        </header>
    );
}
