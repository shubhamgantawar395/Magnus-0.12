'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import {
    Truck,
    Search,
    Filter,
    Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function DispatchPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchPlans = async () => {
            try {
                const response = await apiClient.get('/dispatch/plans');
                setPlans(response.data.data);
            } catch (error) {
                console.error('Error fetching dispatch plans:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlans();
    }, [user, router]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Truck className="w-8 h-8 text-cyan-600" />
                            Dispatch Planning
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Manage dispatch schedules and logistics
                        </p>
                    </div>
                    <Button className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                        <Plus className="w-4 h-4" />
                        Plan Dispatch
                    </Button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 text-center text-slate-500">
                        {loading ? 'Loading...' : plans.length === 0 ? 'No dispatch plans found' : 'Dispatch plans listing...'}
                    </div>
                </div>
            </div>
        </div>
    );
}
