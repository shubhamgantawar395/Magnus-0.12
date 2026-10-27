'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ChevronLeft, Download, Pencil, X, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoiceItem {
    id: string;
    partNumber: string;
    partDescription?: string;
    hsnCode?: string;
    challanQuantity: number;
    invoiceQuantity: number;
    unitPrice: number;
    amount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalAmount: number;
    gateReceivedQty?: number;
    gateRemarks?: string;
    challanItem: {
        challan: {
            challanNumber: string;
        };
    };
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    vendor: {
        companyName: string;
        gstin?: string;
        address?: string;
        logoUrl?: string;
        contactEmail?: string;
        contactPhone?: string;
        bankName?: string;
        accountNumber?: string;
        ifscCode?: string;
    };
    customer: {
        companyName: string;
        gstin?: string;
        address?: string;
    };
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalAmount: number;
    balanceAmount: number;
    paidAmount: number;
    status: string;
    remarks?: string;
    gateRemarks?: string;
    gateApprovedAt?: string;
    items: InvoiceItem[];
    isInterState: boolean;
}

// Statuses where vendor can still edit
const EDITABLE_STATUSES = ['draft', 'submitted'];

export default function InvoiceViewPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuthStore();
    const id = params?.id as string;
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
    const [editInvoiceDate, setEditInvoiceDate] = useState('');
    const [editRemarks, setEditRemarks] = useState('');
    const [editItemQtys, setEditItemQtys] = useState<Map<string, number>>(new Map());
    const [editItemRates, setEditItemRates] = useState<Map<string, number>>(new Map());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (id) fetchInvoice();
    }, [id]);

    const fetchInvoice = async () => {
        try {
            const res = await apiClient.get(`/vendor-invoices/${id}`);
            setInvoice(res.data);
        } catch (error) {
            console.error('Failed to fetch invoice:', error);
            toast.error('Failed to load invoice');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = () => {
        if (!invoice) return;
        setEditInvoiceNumber(invoice.invoiceNumber);
        setEditInvoiceDate(invoice.invoiceDate.split('T')[0]);
        setEditRemarks(invoice.remarks || '');
        const qtys = new Map<string, number>();
        const rates = new Map<string, number>();
        invoice.items.forEach(item => {
            qtys.set(item.id, item.invoiceQuantity);
            rates.set(item.id, item.unitPrice);
        });
        setEditItemQtys(qtys);
        setEditItemRates(rates);
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!invoice) return;
        setSaving(true);
        try {
            const items = invoice.items.map(item => ({
                id: item.id,
                invoiceQuantity: editItemQtys.get(item.id) ?? item.invoiceQuantity,
                unitPrice: editItemRates.get(item.id) ?? item.unitPrice,
            }));

            await apiClient.put(`/vendor-invoices/${id}`, {
                invoiceNumber: editInvoiceNumber,
                invoiceDate: editInvoiceDate,
                remarks: editRemarks,
                items,
            });

            toast.success('Invoice updated successfully');
            setShowEditModal(false);
            fetchInvoice();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update invoice');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!confirm('Submit this invoice for approval? You can still edit it until security approves.')) return;
        try {
            await apiClient.post(`/vendor-invoices/${id}/submit`);
            toast.success('Invoice submitted successfully!');
            fetchInvoice();
        } catch (error: any) {
            console.error('Failed to submit invoice:', error);
            toast.error(error.response?.data?.message || 'Failed to submit invoice');
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
            draft: {
                cls: 'bg-slate-200 text-slate-800 border-slate-300',
                label: 'Draft',
                icon: <Clock className="w-3 h-3 inline mr-1" />,
            },
            submitted: {
                cls: 'bg-blue-100 text-blue-800 border-blue-200',
                label: 'Submitted',
                icon: <AlertCircle className="w-3 h-3 inline mr-1" />,
            },
            gate_approved: {
                cls: 'bg-purple-100 text-purple-800 border-purple-200',
                label: 'Gate Approved',
                icon: <ShieldCheck className="w-3 h-3 inline mr-1" />,
            },
            approved: {
                cls: 'bg-green-100 text-green-800 border-green-200',
                label: 'Approved',
                icon: <CheckCircle2 className="w-3 h-3 inline mr-1" />,
            },
            paid: {
                cls: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                label: 'Paid',
                icon: <CheckCircle2 className="w-3 h-3 inline mr-1" />,
            },
            cancelled: {
                cls: 'bg-red-100 text-red-800 border-red-200',
                label: 'Cancelled',
                icon: <X className="w-3 h-3 inline mr-1" />,
            },
        };
        const c = config[status] || { cls: 'bg-gray-100 border-gray-200 text-gray-800', label: status, icon: null };
        return (
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${c.cls}`}>
                {c.icon}{c.label}
            </span>
        );
    };

    const isVendorRole = user && ['vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor'].includes(user.role);
    const canEdit = isVendorRole && invoice && EDITABLE_STATUSES.includes(invoice.status);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6 flex items-center justify-center">
                <div className="text-white text-xl">Loading invoice...</div>
            </div>
        );
    }

    if (!invoice) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header Actions */}
                <div className="mb-6 flex justify-between items-center print:hidden">
                    <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => router.back()}>
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </Button>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="bg-slate-900/50 text-slate-300 border-slate-700 hover:bg-slate-800"
                            onClick={() => window.print()}
                        >
                            <Download className="w-4 h-4 mr-2" /> Print PDF
                        </Button>
                        {canEdit && (
                            <Button
                                variant="outline"
                                className="bg-slate-900/50 text-amber-400 border-amber-700 hover:bg-amber-900/30"
                                onClick={openEditModal}
                            >
                                <Pencil className="w-4 h-4 mr-2" /> Edit Invoice
                            </Button>
                        )}
                        {invoice.status === 'draft' && isVendorRole && (
                            <Button
                                onClick={handleSubmit}
                                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-900/50"
                            >
                                Submit for Approval
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status info banners */}
                {invoice.status === 'submitted' && (
                    <div className="mb-4 bg-blue-900/30 border border-blue-700/50 rounded-xl px-5 py-3 text-blue-300 text-sm flex items-center gap-2 print:hidden">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        This invoice is pending gate verification by security. You can still edit it until it&apos;s gate-approved.
                    </div>
                )}
                {invoice.status === 'gate_approved' && (
                    <div className="mb-4 bg-purple-900/30 border border-purple-700/50 rounded-xl px-5 py-3 text-purple-300 text-sm flex items-center gap-2 print:hidden">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        Gate approved on {invoice.gateApprovedAt ? new Date(invoice.gateApprovedAt).toLocaleString() : '—'}. Invoice is now locked for editing and awaiting PPC approval.
                        {invoice.gateRemarks && <span className="ml-2 text-purple-200">Gate remarks: {invoice.gateRemarks}</span>}
                    </div>
                )}

                {/* INVOICE PAPER VIEW */}
                <Card className="bg-white text-slate-900 shadow-2xl overflow-hidden print:shadow-none print:border-none">
                    {/* Header */}
                    <div className="p-8 border-b border-slate-200">
                        <div className="flex justify-between items-start">
                            <div className="flex items-start gap-4">
                                {invoice.vendor.logoUrl ? (
                                    <img src={invoice.vendor.logoUrl} alt="Logo" className="h-20 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-16 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs text-center border border-dashed border-slate-300">
                                        No Logo
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{invoice.vendor.companyName}</h2>
                                    <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                                        <p>{invoice.vendor.address || 'Address Not Available'}</p>
                                        <p>{invoice.vendor.contactEmail} • {invoice.vendor.contactPhone}</p>
                                        <p className="font-mono text-xs mt-1 text-slate-600 font-semibold">GSTIN: {invoice.vendor.gstin}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-extrabold text-slate-200 uppercase tracking-widest">Tax Invoice</div>
                                <div className="mt-4 space-y-2">
                                    <div className="text-sm font-bold text-slate-700 text-lg">#{invoice.invoiceNumber}</div>
                                    <div className="text-sm text-slate-500">Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</div>
                                    <div className="mt-2">{getStatusBadge(invoice.status)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="p-8 grid grid-cols-2 gap-12 bg-slate-50/50">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Billed To (Customer)</h4>
                            <div className="text-sm text-slate-700 space-y-1">
                                <p className="font-bold text-lg text-slate-900">{invoice.customer.companyName}</p>
                                <p className="max-w-xs">{invoice.customer.address}</p>
                                <p className="font-mono text-xs font-semibold pt-1">GSTIN: {invoice.customer.gstin}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">Place of Supply</h4>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {invoice.isInterState ? 'Inter-State' : 'Intra-State'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-0">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold border-y border-slate-200">
                                <tr>
                                    <th className="px-8 py-3 w-16 text-center">#</th>
                                    <th className="px-4 py-3">Item / Description</th>
                                    <th className="px-4 py-3 text-right">Challan</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    {invoice.status === 'gate_approved' && (
                                        <th className="px-4 py-3 text-right">Gate Rcvd</th>
                                    )}
                                    <th className="px-4 py-3 text-right">Rate</th>
                                    <th className="px-8 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.items.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-8 py-4 text-slate-400 font-mono text-center">{idx + 1}</td>
                                        <td className="px-4 py-4 font-medium text-slate-900">
                                            {item.partNumber}
                                            <div className="text-slate-500 text-xs font-normal">{item.partDescription}</div>
                                            {item.hsnCode && <div className="text-slate-400 text-[10px] mt-0.5">HSN: {item.hsnCode}</div>}
                                        </td>
                                        <td className="px-4 py-4 text-right text-slate-500 font-mono text-xs">{item.challanItem.challan.challanNumber}</td>
                                        <td className="px-4 py-4 text-right font-medium">{item.invoiceQuantity}</td>
                                        {invoice.status === 'gate_approved' && (
                                            <td className="px-4 py-4 text-right">
                                                {item.gateReceivedQty !== undefined && item.gateReceivedQty !== null ? (
                                                    <span className={`font-semibold ${
                                                        item.gateReceivedQty === item.invoiceQuantity
                                                            ? 'text-green-700'
                                                            : item.gateReceivedQty < item.invoiceQuantity
                                                            ? 'text-orange-600'
                                                            : 'text-blue-600'
                                                    }`}>
                                                        {item.gateReceivedQty}
                                                        {item.gateReceivedQty < item.invoiceQuantity && ' ⚠'}
                                                        {item.gateReceivedQty > item.invoiceQuantity && ' ↑'}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                        )}
                                        <td className="px-4 py-4 text-right text-slate-600">₹{item.unitPrice.toLocaleString()}</td>
                                        <td className="px-8 py-4 text-right font-bold text-slate-900">₹{item.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Totals */}
                    <div className="p-8 border-t border-slate-200">
                        <div className="grid grid-cols-12 gap-8">
                            {/* Bank Details & Remarks */}
                            <div className="col-span-7 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" /> Bank Details
                                    </h4>
                                    <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm text-slate-600 space-y-1.5">
                                        <p><span className="font-semibold text-slate-800 w-24 inline-block">Bank Name:</span> {invoice.vendor.bankName || '-'}</p>
                                        <p><span className="font-semibold text-slate-800 w-24 inline-block">Account No:</span> {invoice.vendor.accountNumber || '-'}</p>
                                        <p><span className="font-semibold text-slate-800 w-24 inline-block">IFSC Code:</span> {invoice.vendor.ifscCode || '-'}</p>
                                    </div>
                                </div>
                                {invoice.remarks && (
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Remarks</h4>
                                        <p className="text-sm text-slate-600 italic">{invoice.remarks}</p>
                                    </div>
                                )}
                                {invoice.gateRemarks && invoice.status !== 'draft' && invoice.status !== 'submitted' && (
                                    <div>
                                        <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Gate Remarks</h4>
                                        <p className="text-sm text-slate-600 italic">{invoice.gateRemarks}</p>
                                    </div>
                                )}
                            </div>

                            {/* Totals Calculation */}
                            <div className="col-span-5 bg-slate-50 rounded-xl p-6 h-fit">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-slate-600 text-sm">
                                        <span>Subtotal</span>
                                        <span className="font-medium">₹{invoice.subtotal.toLocaleString()}</span>
                                    </div>

                                    {invoice.isInterState ? (
                                        <div className="flex justify-between text-slate-600 text-sm">
                                            <span>IGST (18%)</span>
                                            <span>₹{invoice.igst.toLocaleString()}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between text-slate-600 text-sm">
                                                <span>CGST</span>
                                                <span>₹{invoice.cgst.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600 text-sm">
                                                <span>SGST</span>
                                                <span>₹{invoice.sgst.toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex justify-between text-slate-900 text-xl font-bold pt-4 border-t border-slate-200">
                                        <span>Total Amount</span>
                                        <span>₹{invoice.totalAmount.toLocaleString()}</span>
                                    </div>

                                    <div className="text-[10px] text-slate-400 text-right mt-2 uppercase tracking-wide">
                                        Amount in INR
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end">
                            <div className="text-xs text-slate-400">
                                <p>Generated by Aaniry VMS</p>
                                <p className="mt-1">This is a computer generated invoice.</p>
                            </div>
                            <div className="text-center w-48">
                                <div className="h-16 mb-2 border-b border-slate-300"></div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Edit Invoice Modal */}
            {showEditModal && invoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-amber-400" />
                                Edit Invoice
                            </h2>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Invoice metadata */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={editInvoiceNumber}
                                        onChange={(e) => setEditInvoiceNumber(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={editInvoiceDate}
                                        onChange={(e) => setEditInvoiceDate(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Line Items</h3>
                                <div className="space-y-3">
                                    {invoice.items.map((item) => (
                                        <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-white font-semibold text-sm">{item.partNumber}</p>
                                                    <p className="text-slate-400 text-xs">{item.partDescription}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5">Challan: {item.challanItem.challan.challanNumber} • Max qty: {item.challanQuantity}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1">Invoice Qty (max {item.challanQuantity})</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={item.challanQuantity}
                                                        value={editItemQtys.get(item.id) ?? item.invoiceQuantity}
                                                        onChange={(e) => {
                                                            const val = Math.min(Number(e.target.value), item.challanQuantity);
                                                            setEditItemQtys(prev => new Map(prev).set(item.id, val));
                                                        }}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-400 mb-1">Unit Rate (₹)</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={editItemRates.get(item.id) ?? item.unitPrice}
                                                        onChange={(e) => {
                                                            setEditItemRates(prev => new Map(prev).set(item.id, Number(e.target.value)));
                                                        }}
                                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Remarks</label>
                                <textarea
                                    value={editRemarks}
                                    onChange={(e) => setEditRemarks(e.target.value)}
                                    rows={2}
                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                                    placeholder="Optional remarks..."
                                />
                            </div>

                            {invoice.status === 'submitted' && (
                                <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 text-amber-300 text-xs">
                                    ⚠ This invoice is already submitted. Saving will update it while keeping it in submitted status.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
                            <Button
                                variant="outline"
                                className="bg-transparent text-slate-300 border-slate-600"
                                onClick={() => setShowEditModal(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
