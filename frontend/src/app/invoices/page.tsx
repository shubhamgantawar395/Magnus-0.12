'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import {
    FileText,
    Search,
    Filter,
    Plus,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function InvoicesPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchInvoices = async () => {
            try {
                const response = await apiClient.get('/invoices');
                setInvoices(response.data.data);
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [user, router]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-8 h-8 text-emerald-600" />
                            Invoice Management
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Track and manage vendor invoices
                        </p>
                    </div>
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4" />
                        Create Invoice
                    </Button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                                ) : invoices.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No invoices found</td></tr>
                                ) : (
                                    invoices.map((inv: any) => (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="px-6 py-4 font-medium">{inv.invoiceNumber}</td>
                                            <td className="px-6 py-4">{inv.vendor?.companyName}</td>
                                            <td className="px-6 py-4">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-medium">₹{inv.grandTotal.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <Badge variant={inv.status === 'paid' ? 'default' : 'outline'}>{inv.status}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="icon"><Download className="w-4 h-4" /></Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
