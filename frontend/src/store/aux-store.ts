import { create } from 'zustand';

export type AuxStatus = 'meeting' | 'available' | 'lunch' | 'break' | 'away';

export const AUX_OPTIONS: { value: AuxStatus; label: string; color: string; dot: string }[] = [
    { value: 'available', label: 'Available',  color: 'text-emerald-400', dot: 'bg-emerald-400' },
    { value: 'meeting',   label: 'Meeting',    color: 'text-blue-400',    dot: 'bg-blue-400'    },
    { value: 'lunch',     label: 'Lunch',      color: 'text-amber-400',   dot: 'bg-amber-400'   },
    { value: 'break',     label: 'Break',      color: 'text-orange-400',  dot: 'bg-orange-400'  },
    { value: 'away',      label: 'Away',       color: 'text-slate-400',   dot: 'bg-slate-400'   },
];

interface AuxState {
    status: AuxStatus;
    setStatus: (status: AuxStatus, token: string) => Promise<void>;
    fetchOwn: (token: string) => Promise<void>;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuxStore = create<AuxState>((set) => ({
    status: 'away',

    fetchOwn: async (token: string) => {
        try {
            const res = await fetch(`${API}/aux-status/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                set({ status: data.status ?? 'away' });
            }
        } catch {
            // silently fail — default stays 'away'
        }
    },

    setStatus: async (status: AuxStatus, token: string) => {
        // Optimistic update
        set({ status });
        try {
            await fetch(`${API}/aux-status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            });
        } catch {
            // silently fail — UI already reflects optimistic state
        }
    },
}));
