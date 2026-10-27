'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    executiveService,
    type VendorComparison,
    type CostAnalysis
} from '@/services/executive.service';
import VendorComparisonMatrix from '@/components/VendorComparisonMatrix';
import CostAnalysisChart from '@/components/CostAnalysisChart';
import {
    BarChart3,
    AlertTriangle,
    Target,
    TrendingUp,
    Briefcase
} from 'lucide-react';

export default function SourcingAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [comparisonData, setComparisonData] = useState<VendorComparison[]>([]);
    const [costData, setCostAnalysis] = useState<CostAnalysis[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [comparison, cost] = await Promise.all([
                    executiveService.getVendorComparison(),
                    executiveService.getCostAnalysis()
                ]);
                setComparisonData(comparison);
                setCostAnalysis(cost);
            } catch (err) {
                console.error(err);
                setError('Failed to load sourcing analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 p-8 flex items-center justify-center">
                <div className="text-center text-red-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2">Error Loading Data</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Calculate some high-level insights
    const totalVendors = comparisonData.length;
    const topPerformer = comparisonData.length > 0 ? comparisonData[0] : null;
    const totalSpend = costData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-indigo-500" />
                        Sourcing & Analytics
                    </h1>
                    <p className="text-slate-400 mt-1">Vendor comparison and cost analysis dashboard</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Active Vendors</p>
                            <h3 className="text-3xl font-bold text-white">{totalVendors}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Briefcase className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Top Performer</p>
                            <h3 className="text-xl font-bold text-white truncate max-w-[200px]">
                                {topPerformer?.name || 'N/A'}
                            </h3>
                            <p className="text-xs text-emerald-400 mt-1">
                                {topPerformer?.metrics.overall}% Overall Score
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                            <Target className="w-6 h-6 text-emerald-400" />
                        </div>
                    </div>
                </Card>

                <Card className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Total Procurement Value</p>
                            <h3 className="text-2xl font-bold text-white">
                                ₹{totalSpend.toLocaleString()}
                            </h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Vendor Comparison Matrix (occupies 2/3 width on large screens) */}
                <VendorComparisonMatrix data={comparisonData} />

                {/* Cost Analysis Chart (occupies 1/3 width) */}
                <CostAnalysisChart data={costData} />
            </div>
        </div>
    );
}
