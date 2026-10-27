'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import ExportButton from '@/components/ExportButton';
import {
    TrendingUp,
    TrendingDown,
    Award,
    XCircle,
    RefreshCcw,
    BarChart3,
} from 'lucide-react';
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function VendorPerformanceDashboard() {
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState<any[]>([]);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [comparisonData, setComparisonData] = useState<any[]>([]);
    const [capabilityData, setCapabilityData] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch vendors
            const vendorsRes = await apiClient.get('/vendors').catch(() => ({ data: [] }));
            const vendorsList = vendorsRes.data || [];
            setVendors(vendorsList);

            // Mock performance metrics (replace with real data from backend)
            const mockPerformance = vendorsList.map((v: any, idx: number) => ({
                id: v.id,
                name: v.companyName,
                onTimeRate: 85 + Math.random() * 10,
                qualityRate: 90 + Math.random() * 8,
                ordersCompleted: Math.floor(50 + Math.random() * 100),
                avgLeadTime: Math.floor(5 + Math.random() * 10),
                rejectionRate: Math.random() * 5,
                activePOs: Math.floor(Math.random() * 20),
            }));

            setPerformanceData(mockPerformance);

            // Top 5 for comparison
            const top5 = mockPerformance
                .sort((a: any, b: any) => b.qualityRate - a.qualityRate)
                .slice(0, 5)
                .map((v: any) => ({
                    name: v.name.substring(0, 15),
                    quality: Math.round(v.qualityRate),
                }));

            setComparisonData(top5);

            // Capability radar (first vendor or default)
            if (vendorsList[0]) {
                setCapabilityData([
                    { capability: 'Machining', value: 85 },
                    { capability: 'Welding', value: 70 },
                    { capability: 'Casting', value: 60 },
                    { capability: 'Assembly', value: 90 },
                    { capability: 'Finishing', value: 75 },
                ]);
            }

        } catch (error) {
            console.error('Error fetching vendor performance:', error);
            toast.error('Failed to load vendor performance data');
        } finally {
            setLoading(false);
        }
    };

    const getPerformanceColor = (rate: number) => {
        if (rate >= 90) return 'text-green-600';
        if (rate >= 75) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <div className="text-slate-500">Loading vendor performance...</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Vendor Performance Dashboard</h1>
                    <p className="text-slate-600 mt-1">Compare vendor metrics and performance indicators</p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        data={performanceData}
                        filename="vendor-performance"
                        columns={[
                            { header: 'Vendor Name', key: 'name' },
                            { header: 'On-Time Rate (%)', key: 'onTimeRate', formatter: (v) => v.toFixed(1) },
                            { header: 'Quality Rate (%)', key: 'qualityRate', formatter: (v) => v.toFixed(1) },
                            { header: 'Orders Completed', key: 'ordersCompleted' },
                            { header: 'Avg Lead Time (days)', key: 'avgLeadTime' },
                            { header: 'Rejection Rate (%)', key: 'rejectionRate', formatter: (v) => v.toFixed(2) },
                        ]}
                    />
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700">Total Vendors</p>
                            <h3 className="text-3xl font-bold text-blue-900 mt-2">{vendors.length}</h3>
                        </div>
                        <Award className="w-12 h-12 text-blue-500 opacity-70" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-700">Avg Quality Rate</p>
                            <h3 className="text-3xl font-bold text-green-900 mt-2">
                                {(performanceData.reduce((sum, v) => sum + v.qualityRate, 0) / performanceData.length || 0).toFixed(1)}%
                            </h3>
                        </div>
                        <TrendingUp className="w-12 h-12 text-green-500 opacity-70" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-700">Avg On-Time Rate</p>
                            <h3 className="text-3xl font-bold text-orange-900 mt-2">
                                {(performanceData.reduce((sum, v) => sum + v.onTimeRate, 0) / performanceData.length || 0).toFixed(1)}%
                            </h3>
                        </div>
                        <TrendingUp className="w-12 h-12 text-orange-500 opacity-70" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-700">Avg Rejection Rate</p>
                            <h3 className="text-3xl font-bold text-red-900 mt-2">
                                {(performanceData.reduce((sum, v) => sum + v.rejectionRate, 0) / performanceData.length || 0).toFixed(2)}%
                            </h3>
                        </div>
                        <XCircle className="w-12 h-12 text-red-500 opacity-70" />
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quality Comparison */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Top 5 Vendors by Quality Score</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" stroke="#64748b" />
                            <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="quality" fill="#10b981" name="Quality Score (%)" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                {/* Vendor Capability Radar */}
                <Card className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Vendor Capabilities (Sample)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={capabilityData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="capability" stroke="#64748b" />
                            <PolarRadiusAxis stroke="#64748b" />
                            <Radar name="Capability Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Detailed Scorecard Table */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Detailed Vendor Scorecards
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendor</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">On-Time Rate</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Quality Rate</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Orders Completed</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Avg Lead Time</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Rejection Rate</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Active POs</th>                            </tr>
                        </thead>
                        <tbody>
                            {performanceData.map((vendor) => (
                                <tr key={vendor.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4 font-medium text-slate-900">{vendor.name}</td>
                                    <td className={`py-3 px-4 text-right font-semibold ${getPerformanceColor(vendor.onTimeRate)}`}>
                                        {vendor.onTimeRate.toFixed(1)}%
                                    </td>
                                    <td className={`py-3 px-4 text-right font-semibold ${getPerformanceColor(vendor.qualityRate)}`}>
                                        {vendor.qualityRate.toFixed(1)}%
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600">{vendor.ordersCompleted}</td>
                                    <td className="py-3 px-4 text-right text-slate-600">{vendor.avgLeadTime} days</td>
                                    <td className={`py-3 px-4 text-right font-semibold ${vendor.rejectionRate > 3 ? 'text-red-600' : 'text-green-600'}`}>
                                        {vendor.rejectionRate.toFixed(2)}%
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600">{vendor.activePOs}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
