'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import {
    ClipboardCheck,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Search,
    Filter,
    TrendingUp,
    TrendingDown,
    RefreshCcw,
    Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { qualityService, type QualityCheck, type QualityStatistics } from '@/services/quality.service';
import toast from 'react-hot-toast';
import CreateQualityCheckDialog from '@/components/CreateQualityCheckDialog';
import QualityCheckDetailDialog from '@/components/QualityCheckDetailDialog';
import QualityTrendsChart from '@/components/QualityTrendsChart';
import DefectDistributionChart from '@/components/DefectDistributionChart';

export default function QualityDashboard() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<QualityStatistics | null>(null);
    const [inspections, setInspections] = useState<QualityCheck[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [defects, setDefects] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch statistics, quality checks, trends, and defects in parallel
            const [statsData, checksData, trendsData, defectsData] = await Promise.all([
                qualityService.getStatistics(),
                qualityService.getQualityChecks(),
                qualityService.getTrends(),
                qualityService.getDefects(),
            ]);

            setStats(statsData);
            setInspections(checksData);
            setTrends(trendsData);
            setDefects(defectsData);
        } catch (error: any) {
            console.error('Error fetching quality data:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch quality data');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { label: string; className: string }> = {
            passed: { label: 'Passed', className: 'bg-green-100 text-green-800' },
            failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
            conditional_pass: { label: 'Conditional', className: 'bg-yellow-100 text-yellow-800' },
            pending: { label: 'Pending', className: 'bg-blue-100 text-blue-800' },
            in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
        };

        const variant = variants[status] || variants.pending;
        return (
            <Badge className={variant.className}>
                {variant.label}
            </Badge>
        );
    };

    const handleRowClick = (check: QualityCheck) => {
        setSelectedCheck(check);
        setDetailDialogOpen(true);
    };

    const filteredInspections = inspections.filter((inspection) => {
        const matchesSearch =
            inspection.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inspection.inspector?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inspection.inspector?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (loading && !stats) {
        return <div className="p-8 text-center text-slate-500">Loading Quality Control Hub...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header with Actions */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Quality Dashboard</h1>
                    <p className="text-slate-600 mt-1">Monitor quality metrics and inspections</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/quality/jobs">
                        <Button variant="outline" className="border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100">
                            Job Tracking & Live Checks
                        </Button>
                    </Link>
                    <Button variant="outline" onClick={fetchData}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        New Check
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700">Pending Inspections</p>
                            <h3 className="text-3xl font-bold text-blue-900 mt-2">
                                {stats?.pendingInspections || 0}
                            </h3>
                        </div>
                        <ClipboardCheck className="w-12 h-12 text-blue-500 opacity-70" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-red-700">Rejected Items</p>
                            <h3 className="text-3xl font-bold text-red-900 mt-2">
                                {stats?.totalRejected || 0}
                            </h3>
                        </div>
                        <XCircle className="w-12 h-12 text-red-500 opacity-70" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-700">Approval Rate</p>
                            <h3 className="text-3xl font-bold text-green-900 mt-2">
                                {stats?.approvalRate.toFixed(1) || 0}%
                            </h3>
                            <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                                <TrendingUp className="w-3 h-3" />
                                Good performance
                            </div>
                        </div>
                        <CheckCircle className="w-12 h-12 text-green-500 opacity-70" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-700">Total Inspected</p>
                            <h3 className="text-3xl font-bold text-purple-900 mt-2">
                                {stats?.totalSamplesInspected || 0}
                            </h3>
                        </div>
                        <AlertTriangle className="w-12 h-12 text-purple-500 opacity-70" />
                    </div>
                </Card>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trends.length > 0 && <QualityTrendsChart data={trends} />}
                {defects.length > 0 && <DefectDistributionChart data={defects} />}
            </div>

            {/* Filters and Search */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by check number or inspector..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="conditional_pass">Conditional</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Inspections Table */}
            <Card>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Inspections</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Check #</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Date</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Inspector</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Sample Size</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Accepted/Rejected</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInspections.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-slate-500">
                                            {searchTerm || statusFilter !== 'all'
                                                ? 'No inspections match your filters'
                                                : 'No inspections found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredInspections.map((inspection) => (
                                        <tr
                                            key={inspection.id}
                                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => handleRowClick(inspection)}
                                        >
                                            <td className="py-3 px-4 text-sm font-medium text-blue-600">
                                                {inspection.checkNumber}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {new Date(inspection.checkDate).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {inspection.inspector
                                                    ? `${inspection.inspector.firstName} ${inspection.inspector.lastName}`
                                                    : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-slate-600">
                                                {inspection.sampleSize}
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                <span className="text-green-600 font-medium">{inspection.acceptedQty}</span>
                                                {' / '}
                                                <span className="text-red-600 font-medium">{inspection.rejectedQty}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(inspection.status)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            <CreateQualityCheckDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={fetchData}
            />

            <QualityCheckDetailDialog
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                check={selectedCheck}
            />
        </div>
    );
}
