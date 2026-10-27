'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    TrendingUp,
    ShieldCheck,
    Truck,
    ArrowLeft,
    Package
} from 'lucide-react';
import { vendorAnalyticsService, type VendorAnalytics } from '@/services/vendor-analytics.service';
import PerformanceTrendChart from '@/components/PerformanceTrendChart';

export default function VendorAnalyticsPage() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);

    useEffect(() => {
        if (!user || (!user.role.startsWith('vendor') && user.role !== 'vendor')) {
            router.push('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const data = await vendorAnalyticsService.getMyAnalytics();
                setAnalytics(data);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                Loading Analytics...
            </div>
        );
    }

    if (!analytics) return null;

    const { overview, trends } = analytics;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 md:p-8 space-y-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard/vendor')}
                        className="text-slate-400 hover:text-white mb-4 pl-0 hover:bg-transparent"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <BarChart3 className="w-8 h-8 text-indigo-500" />
                                Performance Analytics
                            </h1>
                            <p className="text-slate-400">Track your quality scores, delivery performance, and rating trends.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400 mb-1">Overall Rating</div>
                            <div className={`text-4xl font-bold ${overview.overallRating === 'A' ? 'text-emerald-400' : overview.overallRating === 'B' ? 'text-amber-400' : 'text-red-400'}`}>
                                Grade {overview.overallRating}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Quality Score</p>
                                <h3 className={`text-3xl font-bold ${overview.qualityScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{overview.qualityScore}%</h3>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Delivery Score</p>
                                <h3 className={`text-3xl font-bold ${overview.deliveryScore >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>{overview.deliveryScore}%</h3>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <Truck className="w-6 h-6 text-blue-400" />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Total Orders</p>
                                <h3 className="text-3xl font-bold text-white">{overview.totalOrders}</h3>
                            </div>
                            <div className="p-3 bg-indigo-500/10 rounded-lg">
                                <Package className="w-6 h-6 text-indigo-400" />
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-sm font-medium mb-1">Delivered</p>
                                <h3 className="text-3xl font-bold text-white">{overview.totalDelivered}</h3>
                            </div>
                            <div className="p-3 bg-violet-500/10 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-violet-400" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Trend Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="col-span-2">
                        <PerformanceTrendChart data={trends} />
                    </div>
                </div>
            </div>
        </div>
    );
}
