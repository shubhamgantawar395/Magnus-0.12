'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface Invoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    customer: {
        companyName: string;
    };
    totalAmount: number;
    status: string;
    balanceAmount: number;
}

export default function InvoicesPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');

    const handleDownloadPdf = async (id: string) => {
        try {
            const response = await apiClient.get(`/vendor-invoices/${id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download PDF:', error);
            toast.error('Failed to download PDF');
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [statusFilter]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;

            const res = await apiClient.get('/vendor-invoices', { params });
            setInvoices(res.data);
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: 'bg-slate-700 text-slate-300',
            submitted: 'bg-blue-600 text-white',
            gate_approved: 'bg-purple-600 text-white',
            approved: 'bg-green-600 text-white',
            paid: 'bg-emerald-600 text-white',
            cancelled: 'bg-red-600 text-white'
        };
        const labels: Record<string, string> = {
            gate_approved: 'Gate Approved'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-600 text-white'}`}>
                {(labels[status] || status).toUpperCase()}
            </span>
        );
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this invoice?')) return;

        try {
            await apiClient.delete(`/vendor-invoices/${id}`);
            toast.success('Invoice deleted successfully');
            fetchInvoices();
        } catch (error: any) {
            console.error('Failed to delete invoice:', error);
            toast.error(error.response?.data?.message || 'Failed to delete invoice');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Invoices</h1>
                        <p className="text-slate-400">View and manage your vendor invoices</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/vendor/invoices/create')}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all"
                    >
                        + Create Invoice
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Filter by Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Submitted</option>
                                <option value="gate_approved">Gate Approved</option>
                                <option value="approved">Approved</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Invoices Table */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700/50">
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                            <span className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_12px_rgba(139,92,246,0.8)]"></span>
                            Invoice List
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400">Loading invoices...</div>
                        ) : invoices.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                No invoices found. Create your first invoice to get started.
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-slate-900/90 border-b border-slate-700/50">
                                    <tr className="text-xs font-bold text-slate-400 uppercase">
                                        <th className="px-6 py-3 text-left">Invoice No</th>
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">Customer</th>
                                        <th className="px-6 py-3 text-right">Total Amount</th>
                                        <th className="px-6 py-3 text-right">Balance</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {invoices.map(invoice => (
                                        <tr key={invoice.id} className="hover:bg-slate-900/50 transition-colors">
                                            <td className="px-6 py-4 text-cyan-400 font-mono font-semibold">
                                                {invoice.invoiceNumber}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {new Date(invoice.invoiceDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-white">{invoice.customer.companyName}</td>
                                            <td className="px-6 py-4 text-right text-white font-semibold">
                                                ₹{invoice.totalAmount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-orange-400 font-semibold">
                                                ₹{invoice.balanceAmount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(invoice.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/dashboard/vendor/invoices/${invoice.id}`)}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-all flex items-center gap-1"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPdf(invoice.id)}
                                                        className="px-3 py-1.5 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 transition-all flex items-center gap-1"
                                                        title="Download PDF"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        PDF
                                                    </button>
                                                    {invoice.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleDelete(invoice.id)}
                                                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-all"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
