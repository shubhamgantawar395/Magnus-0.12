'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    FileText, Search, Filter, Eye, CheckCircle,
    Clock, AlertCircle, RefreshCw, Download, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

export default function AdminInvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const params: any = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const res = await apiClient.get('/vendor-invoices', { params });
            setInvoices(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [statusFilter]);

    const STATUS_CONFIG: Record<string, { style: string; icon: React.ReactNode; label: string }> = {
        draft: { style: 'bg-slate-100 text-slate-800 border-slate-200', icon: <FileText className="w-3 h-3" />, label: 'Draft' },
        submitted: { style: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3" />, label: 'Submitted' },
        gate_approved: { style: 'bg-purple-100 text-purple-800 border-purple-200', icon: <ShieldCheck className="w-3 h-3" />, label: 'Gate Approved' },
        approved: { style: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
        paid: { style: 'bg-blue-100 text-blue-800 border-blue-200', icon: <CheckCircle className="w-3 h-3" />, label: 'Paid' },
        cancelled: { style: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-3 h-3" />, label: 'Cancelled' },
    };

    const getStatusStyle = (status: string) => STATUS_CONFIG[status]?.style || STATUS_CONFIG.draft.style;
    const getStatusIcon = (status: string) => STATUS_CONFIG[status]?.icon || null;
    const getStatusLabel = (status: string) => STATUS_CONFIG[status]?.label || status;

    const filteredInvoices = invoices.filter(inv => {
        const search = searchTerm.toLowerCase();
        return (
            inv.invoiceNumber?.toLowerCase().includes(search) ||
            inv.vendor?.companyName?.toLowerCase().includes(search) ||
            inv.vendor?.vendorCode?.toLowerCase().includes(search) ||
            inv.items?.some((item: any) =>
                item.partNumber?.toLowerCase().includes(search) ||
                item.partDescription?.toLowerCase().includes(search)
            )
        );
    });

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-l-4 border-indigo-600 pl-3">
                        Vendor Invoices
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 pl-4">
                        Review and approve invoices submitted by vendors
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search invoice or vendor..."
                            className="pl-9 bg-white border-slate-200 focus-visible:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 shadow-sm">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <select
                                className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 outline-none w-full cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted (Awaiting Gate)</option>
                                <option value="gate_approved">Gate Approved (Pending PPC)</option>
                                <option value="approved">Approved</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchInvoices}
                            disabled={isLoading}
                            className="shrink-0"
                            title="Refresh"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Invoice Details</th>
                                <th className="px-6 py-4">Vendor</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 whitespace-nowrap">Amount (₹)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                            <p>Loading invoices...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <p className="text-base font-medium text-slate-900">No invoices found</p>
                                            <p className="text-sm">Try adjusting your filters or search term.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                {invoice.invoiceNumber}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {invoice.items?.length || 0} items
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {invoice.vendor?.companyName}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono mt-1">
                                                {invoice.vendor?.vendorCode}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {invoice.totalAmount?.toLocaleString('en-IN', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                GST: {((invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0)).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(invoice.status)}`}>
                                                {getStatusIcon(invoice.status)}
                                                {getStatusLabel(invoice.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                                <Link href={`/dashboard/admin/invoices/${invoice.id}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 gap-2 hover:bg-indigo-50 hover:text-indigo-600">
                                                        <Eye className="w-4 h-4" />
                                                        <span className="hidden xl:inline">Review</span>
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => {
                                                        window.open(`${process.env.NEXT_PUBLIC_API_URL}/vendor-invoices/${invoice.id}/pdf`, '_blank');
                                                    }}
                                                    title="Download PDF"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredInvoices.length > 0 && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                        <div>Showing {filteredInvoices.length} invoices</div>
                        <div className="font-medium">
                            Total Value: ₹{filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
