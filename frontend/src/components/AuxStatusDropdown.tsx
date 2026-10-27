'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuxStore, AUX_OPTIONS, AuxStatus } from '@/store/aux-store';
import { useAuthStore } from '@/store/auth-store';

export default function AuxStatusDropdown() {
    const { user, token } = useAuthStore();
    const { status, setStatus, fetchOwn } = useAuxStore();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // On mount, fetch the user's current status from the API
    useEffect(() => {
        if (token) fetchOwn(token);
    }, [token]);

    // Non-logged-in users always show 'away' and cannot change it
    const isLoggedIn = !!user && !!token;

    // Resolve current option
    const current = AUX_OPTIONS.find((o) => o.value === status) ?? AUX_OPTIONS[4];

    const handleSelect = (val: AuxStatus) => {
        if (!isLoggedIn) return;
        setStatus(val, token as string);
        setOpen(false);
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative select-none">
            {/* Trigger */}
            <button
                onClick={() => isLoggedIn && setOpen((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${isLoggedIn
                        ? 'bg-slate-800 hover:bg-slate-700 cursor-pointer'
                        : 'bg-slate-800/50 cursor-default opacity-60'}
                `}
                title={isLoggedIn ? 'Set your status' : 'Not logged in — status is Away'}
            >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${current.dot}`} />
                <span className={`${current.color} hidden sm:inline`}>{current.label}</span>
                {isLoggedIn && (
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Dropdown */}
            {open && isLoggedIn && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    {AUX_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleSelect(opt.value)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left
                                ${status === opt.value
                                    ? 'bg-slate-700 font-semibold'
                                    : 'hover:bg-slate-700/60'}
                            `}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                            <span className={opt.color}>{opt.label}</span>
                            {status === opt.value && (
                                <span className="ml-auto text-slate-400 text-xs">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
