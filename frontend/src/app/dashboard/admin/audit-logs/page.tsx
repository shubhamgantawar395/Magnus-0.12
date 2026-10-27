'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import ExportButton from '@/components/ExportButton';
import {
    Clock,
    User,
    FileText,
    Filter,
    RefreshCcw,
    Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AuditLogsPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({
        action: '',
        entityType: '',
        startDate: '',
        endDate: '',
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params: any = {
                page: pagination.page,
                limit: 50,
            };
            if (filters.action) params.action = filters.action;
            if (filters.entityType) params.entityType = filters.entityType;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const res = await apiClient.get('/audit-logs', { params });
            setLogs(res.data.data || []);
            setPagination({
                page: res.data.meta.page,
                total: res.data.meta.total,
                totalPages: res.data.meta.totalPages,
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE': return 'bg-green-100 text-green-800';
            case 'UPDATE': return 'bg-blue-100 text-blue-800';
            case 'DELETE': return 'bg-red-100 text-red-800';
            case 'LOGIN': return 'bg-purple-100 text-purple-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.user?.email?.toLowerCase().includes(search) ||
            log.action?.toLowerCase().includes(search) ||
            log.entityType?.toLowerCase().includes(search) ||
            log.entityId?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
                    <p className="text-slate-600 mt-1">Track all system actions and changes</p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        data={filteredLogs}
                        filename="audit-logs"
                        columns={[
                            { header: 'Timestamp', key: 'createdAt', formatter: (v) => format(new Date(v), 'yyyy-MM-dd HH:mm:ss') },
                            { header: 'User', key: 'user', formatter: (v) => v ? `${v.firstName} ${v.lastName} (${v.email})` : 'N/A' },
                            { header: 'Action', key: 'action' },
                            { header: 'Entity Type', key: 'entityType' },
                            { header: 'Entity ID', key: 'entityId' },
                        ]}
                    />
                    <Button variant="outline" onClick={fetchLogs}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Action</label>
                        <select
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        >
                            <option value="">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="LOGIN">Login</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Entity Type</label>
                        <select
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                            value={filters.entityType}
                            onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
                        >
                            <option value="">All Types</option>
                            <option value="User">User</option>
                            <option value="PurchaseOrder">Purchase Order</option>
                            <option value="StockStatement">Stock Statement</option>
                            <option value="QualityCheck">Quality Check</option>
                            <option value="Vendor">Vendor</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Start Date</label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">End Date</label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                </div>
            </Card>

            {/* Logs Timeline */}
            <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Activity Timeline
                </h3>

                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading logs...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">No audit logs found</div>
                ) : (
                    <div className="space-y-4">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                                <div className="flex-shrink-0">
                                    <Badge className={getActionColor(log.action)}>
                                        {log.action}
                                    </Badge>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium text-slate-900">
                                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown User'}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            ({log.user?.email || 'N/A'})
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <FileText className="w-4 h-4" />
                                        <span>
                                            {log.action} <strong>{log.entityType}</strong>
                                            {log.entityId && <> (ID: <code className="bg-slate-100 px-1 rounded">{log.entityId}</code>)</>}
                                        </span>
                                    </div>
                                    {log.changes && Object.keys(log.changes).length > 0 && (
                                        <details className="mt-2 text-sm">
                                            <summary className="cursor-pointer text-blue-600 hover:text-blue-700">View Changes</summary>
                                            <pre className="mt-2 p-2 bg-slate-100 rounded text-xs overflow-x-auto">
                                                {JSON.stringify(log.changes, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <div className="text-sm text-slate-600">
                                        {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                        <div className="text-sm text-slate-600">
                            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total logs)
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
