'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { executiveService, type VendorAnalytics } from '@/services/executive.service';
import PerformanceTrendChart from '@/components/PerformanceTrendChart';
import {
    ArrowLeft,
    Building2,
    Mail,
    Phone,
    MapPin,
    Package,
    IndianRupee,
    ShieldCheck,
    Truck,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

export default function VendorAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const vendorId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<VendorAnalytics | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!vendorId) return;

        const fetchData = async () => {
            try {
                const result = await executiveService.getVendorDetails(vendorId);
                setData(result);
            } catch (err) {
                console.error(err);
                setError('Failed to load vendor analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [vendorId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading Vendor Analytics...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
                <Card className="bg-slate-900 border-red-900/50 max-w-md w-full p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
                    <p className="text-slate-400 mb-6">{error || 'Vendor not found'}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        Go Back
                    </button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 md:p-8 space-y-8">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            {data.profile.name}
                            <span className={`px-3 py-1 text-sm rounded-full border ${data.profile.rating.startsWith('A') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                    data.profile.rating === 'B' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                        'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                Grade {data.profile.rating}
                            </span>
                        </h1>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                            <span className="flex items-center gap-1.5">
                                <Building2 className="w-4 h-4" /> {data.profile.code}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" /> {data.profile.address || 'Location N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {data.profile.email && (
                            <Link
                                href={`mailto:${data.profile.email}`}
                                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                                title="Send Email"
                            >
                                <Mail className="w-5 h-5" />
                            </Link>
                        )}
                        {data.profile.phone && (
                            <Link
                                href={`tel:${data.profile.phone}`}
                                className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                                title="Call Vendor"
                            >
                                <Phone className="w-5 h-5" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Orders</p>
                            <h3 className="text-2xl font-bold text-white">{data.stats.totalOrders}</h3>
                            <p className="text-xs text-slate-500 mt-1">{data.stats.openOrders} Active</p>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-lg">
                            <Package className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Value</p>
                            <h3 className="text-2xl font-bold text-white">
                                ₹{data.stats.totalValue.toLocaleString()}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Lifetime Spend</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                            <IndianRupee className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Quality Score</p>
                            <h3 className="text-2xl font-bold text-white">{data.stats.qualityScore}%</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {data.stats.rejectionRate}% Rejection Rate
                            </p>
                        </div>
                        <div className="p-3 bg-rose-500/10 rounded-lg">
                            <ShieldCheck className="w-6 h-6 text-rose-400" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Delivered Qty</p>
                            <h3 className="text-2xl font-bold text-white">{data.stats.totalDeliveredQty.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500 mt-1">Units Accepted</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Truck className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <PerformanceTrendChart data={data.qualityTrend} />
                </div>

                {/* Additional Widget / Quick Actions */}
                <div className="space-y-6">
                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-amber-400" />
                            Performance Summary
                        </h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-400 text-sm">Quality Consistency</span>
                                    <span className="text-white font-medium">Strong</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[85%]"></div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-400 text-sm">Delivery Timeliness</span>
                                    <span className="text-white font-medium">Average</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-amber-500 w-[65%]"></div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-400 text-sm">Cost Efficiency</span>
                                    <span className="text-white font-medium">Excellent</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 w-[92%]"></div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Strategic Notes</h3>
                        <textarea
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                            rows={4}
                            placeholder="Add internal notes about this vendor..."
                        />
                        <button className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                            Save Note
                        </button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
