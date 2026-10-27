'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
    ArrowLeft, FileText, CheckCircle, Clock,
    AlertCircle, Download, Check, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminInvoiceDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [invoice, setInvoice] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);

    useEffect(() => {
        fetchInvoiceDetails();
    }, [id]);

    const fetchInvoiceDetails = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/vendor-invoices/${id}`);
            setInvoice(res.data);
        } catch (error) {
            console.error('Failed to fetch invoice:', error);
            toast.error('Failed to load invoice details');
            router.push('/dashboard/admin/invoices');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        // Double confirm intention with a toast if needed, here we'll directly do it
        setIsApproving(true);
        try {
            await apiClient.post(`/vendor-invoices/${id}/approve`);
            toast.success('Invoice approved successfully!');
            fetchInvoiceDetails(); // Refresh to see new status
        } catch (error: any) {
            console.error('Approval failed:', error);
            toast.error(error.response?.data?.message || 'Failed to approve invoice');
        } finally {
            setIsApproving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex bg-slate-50 items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!invoice) return null;

    const getStatusTheme = (status: string) => {
        const themes: Record<string, { bg: string, text: string, border: string, icon: any, label: string }> = {
            draft: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: FileText, label: 'Draft' },
            submitted: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: Clock, label: 'Submitted' },
            gate_approved: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', icon: ShieldCheck, label: 'Gate Approved' },
            approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', icon: CheckCircle, label: 'Approved' },
            paid: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: CheckCircle, label: 'Paid' },
            cancelled: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: AlertCircle, label: 'Cancelled' }
        };
        return themes[status] || themes.draft;
    };

    const StatusIcon = getStatusTheme(invoice.status).icon;
    const theme = getStatusTheme(invoice.status);

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 bg-slate-50 min-h-screen">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="space-y-1">
                    <button
                        onClick={() => router.back()}
                        className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Invoices
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Invoice {invoice.invoiceNumber}
                        </h1>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${theme.bg} ${theme.text} ${theme.border} capitalize shadow-sm`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {theme.label}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500">
                        Generated on {format(new Date(invoice.createdAt), 'MMMM d, yyyy')}
                    </p>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <Button
                        variant="outline"
                        onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/vendor-invoices/${id}/pdf`, '_blank')}
                        className="gap-2 shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Download PDF
                    </Button>

                    {invoice.status === 'gate_approved' && (
                        <Button
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md shadow-indigo-600/20"
                        >
                            {isApproving ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div>
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Approve Invoice (PPC)
                        </Button>
                    )}
                    {invoice.status === 'submitted' && (
                        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            Awaiting gate verification by security
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vendor Details */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-900">Vendor Details</h2>
                    </div>
                    <div className="p-6 flex-1 space-y-4 text-sm">
                        <div>
                            <p className="text-slate-500 mb-1">Company Name</p>
                            <p className="font-medium text-slate-900">{invoice.vendor?.companyName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-500 mb-1">Vendor Code</p>
                                <p className="text-slate-900 font-mono">{invoice.vendor?.vendorCode}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">GSTIN</p>
                                <p className="text-slate-900 font-mono">{invoice.vendorGstin || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-1">Address</p>
                            <p className="text-slate-900">
                                {invoice.vendor?.address}, {invoice.vendor?.city} {invoice.vendor?.pincode}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Invoice Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-semibold text-slate-900">Bill To</h2>
                    </div>
                    <div className="p-6 flex-1 space-y-4 text-sm">
                        <div>
                            <p className="text-slate-500 mb-1">Company Name</p>
                            <p className="font-medium text-slate-900">{invoice.customer?.companyName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-500 mb-1">Invoice Date</p>
                                <p className="text-slate-900 font-medium">{format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">GSTIN</p>
                                <p className="text-slate-900 font-mono">{invoice.customerGstin || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-slate-500 mb-1">Place of Supply</p>
                            <p className="text-slate-900">{invoice.placeOfSupply || 'N/A'} {invoice.isInterState ? '(Inter-State)' : ''}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gate Approval Info Banner */}
            {(invoice.status === 'gate_approved' || invoice.status === 'approved' || invoice.status === 'paid') && invoice.gateApprovedAt && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-800">
                        <p className="font-semibold mb-0.5">Gate Verified</p>
                        <p>Physical delivery verified on {format(new Date(invoice.gateApprovedAt), 'dd MMM yyyy, h:mm a')}</p>
                        {invoice.gateRemarks && <p className="mt-1 text-purple-600 italic">Gate remarks: {invoice.gateRemarks}</p>}
                    </div>
                </div>
            )}

            {/* Line Items */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="font-semibold text-slate-900">Line Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Challan Date</th>
                                <th className="px-6 py-4 font-medium text-right">Inv Qty</th>
                                {(invoice.status === 'gate_approved' || invoice.status === 'approved' || invoice.status === 'paid') && (
                                    <th className="px-6 py-4 font-medium text-right">Gate Rcvd</th>
                                )}
                                <th className="px-6 py-4 font-medium text-right">Rate</th>
                                <th className="px-6 py-4 font-medium text-right">Tax (%)</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoice.items?.map((item: any, idx: number) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">
                                            {item.partNumber}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {item.partDescription || 'Component part'}
                                        </div>
                                        <div className="text-xs text-indigo-600 mt-1">
                                            Challan: {item.challanItem?.challan?.challanNumber}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                        {item.challanItem?.challan?.challanDate ? format(new Date(item.challanItem.challan.challanDate), 'dd MMM yyyy') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-slate-900">
                                        {item.invoiceQuantity}
                                    </td>
                                    {(invoice.status === 'gate_approved' || invoice.status === 'approved' || invoice.status === 'paid') && (
                                        <td className="px-6 py-4 text-right tabular-nums">
                                            {item.gateReceivedQty != null ? (
                                                <span className={`font-semibold ${
                                                    item.gateReceivedQty === item.invoiceQuantity ? 'text-emerald-700' :
                                                    item.gateReceivedQty < item.invoiceQuantity ? 'text-orange-600' : 'text-blue-600'
                                                }`}>
                                                    {item.gateReceivedQty}
                                                    {item.gateReceivedQty < item.invoiceQuantity && <span className="ml-1 text-xs">(short)</span>}
                                                    {item.gateReceivedQty > item.invoiceQuantity && <span className="ml-1 text-xs">(excess)</span>}
                                                </span>
                                            ) : '—'}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right tabular-nums text-slate-900">
                                        ₹{item.unitPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums text-slate-600">
                                        {invoice.isInterState ?
                                            `IGST @ ${item.igstRate}%` :
                                            `CGST+SGST @ ${item.cgstRate + item.sgstRate}%`
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium tabular-nums text-slate-900">
                                        ₹{item.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-50 p-6 md:p-8 border-t border-slate-200">
                    <div className="max-w-xs ml-auto space-y-3 text-sm">
                        <div className="flex justify-between items-center text-slate-600">
                            <span>Subtotal</span>
                            <span className="tabular-nums font-medium">₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
                        </div>

                        {invoice.isInterState ? (
                            <div className="flex justify-between items-center text-slate-600">
                                <span>IGST</span>
                                <span className="tabular-nums">₹{invoice.igst?.toLocaleString('en-IN')}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>CGST</span>
                                    <span className="tabular-nums">₹{invoice.cgst?.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>SGST</span>
                                    <span className="tabular-nums">₹{invoice.sgst?.toLocaleString('en-IN')}</span>
                                </div>
                            </>
                        )}

                        <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center">
                            <span className="font-semibold text-slate-900 text-base">Grand Total</span>
                            <span className="font-bold text-indigo-700 text-lg tabular-nums border-b-2 border-indigo-200 pb-0.5">
                                ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {invoice.remarks && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-sm">
                    <h3 className="font-medium text-slate-900 mb-2">Remarks</h3>
                    <p className="text-slate-600 whitespace-pre-wrap">{invoice.remarks}</p>
                </div>
            )}
        </div>
    );
}
