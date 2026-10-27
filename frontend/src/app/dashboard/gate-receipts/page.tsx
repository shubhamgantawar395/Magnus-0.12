'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import {
    PackageCheck, Truck, ClipboardList, CheckCircle2, AlertTriangle,
    Clock, Search, Plus, X, ChevronDown, ChevronUp, Eye, FileText, ShieldCheck,
    BookOpen, Download, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChallanItem {
    id: string;
    partNumber: string;
    partDescription?: string;
    quantity: number;
    receiptItems?: { receivedQty: number }[];
}

interface Challan {
    id: string;
    challanNumber: string;
    challanDate: string;
    poNumber?: string;
    vehicleNumber?: string;
    driverName?: string;
    totalQuantity: number;
    vendorId: string;
    vendor: { id: string; companyName: string; vendorCode: string };
    items: ChallanItem[];
}

interface Receipt {
    id: string;
    receiptNumber: string;
    receiptDate: string;
    vehicleNumber?: string;
    driverName?: string;
    status: string;
    vendor: { companyName: string };
    receivedBy?: { firstName: string; lastName: string };
    items?: any[];
    remarks?: string;
}

interface ReceiptFormItem {
    challanItemId: string;
    partNumber: string;
    partDescription: string;
    expectedQty: number;
    receivedQty: number;
    shortQty: number;
    excessQty: number;
    rejectedAtGate: number;
    remarks: string;
}

// ─── Tax Invoice types ─────────────────────────────────────────────────────────
interface TaxInvoiceItem {
    id: string;
    partNumber: string;
    partDescription?: string;
    invoiceQuantity: number;
    unitPrice: number;
    totalAmount: number;
    gateReceivedQty?: number;
    gateRemarks?: string;
}

interface TaxInvoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    status: string;
    totalAmount: number;
    vendor: { companyName: string; vendorCode?: string };
    items: TaxInvoiceItem[];
}

interface GateFormItem {
    itemId: string;
    partNumber: string;
    partDescription: string;
    invoiceQty: number;
    gateReceivedQty: number;
    gateRemarks: string;
}

// ─── Status configs ────────────────────────────────────────────────────────────
const RECEIPT_STATUS: Record<string, { label: string; color: string }> = {
    pending_inspection: { label: 'Pending Inspection', color: 'bg-yellow-500/20 text-yellow-400' },
    inspected: { label: 'Inspected', color: 'bg-blue-500/20 text-blue-400' },
    accepted: { label: 'Accepted', color: 'bg-green-500/20 text-green-400' },
    partially_accepted: { label: 'Partial', color: 'bg-orange-500/20 text-orange-400' },
    rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400' },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function GateReceiptsPage() {
    const { user } = useAuthStore();

    const [tab, setTab] = useState<'invoices' | 'challans' | 'history' | 'material-register'>('invoices');
    const [challans, setChallans] = useState<Challan[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [taxInvoices, setTaxInvoices] = useState<TaxInvoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // GRN modal (challan-based)
    const [showModal, setShowModal] = useState(false);
    const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
    const [formItems, setFormItems] = useState<ReceiptFormItem[]>([]);
    const [vehicle, setVehicle] = useState('');
    const [driver, setDriver] = useState('');
    const [lrNumber, setLrNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Gate-approve modal (invoice-based)
    const [showGateModal, setShowGateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<TaxInvoice | null>(null);
    const [gateItems, setGateItems] = useState<GateFormItem[]>([]);
    const [gateRemarks, setGateRemarks] = useState('');
    const [gateSubmitting, setGateSubmitting] = useState(false);

    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Helper to get local date string YYYY-MM-DD
    const getLocalDateString = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    // Material In/Out Register
    const [matStartDate, setMatStartDate] = useState(getLocalDateString());
    const [matEndDate, setMatEndDate] = useState(getLocalDateString());
    const [matData, setMatData] = useState<{ incoming: any[]; outgoing: any[] }>({ incoming: [], outgoing: [] });
    const [matLoading, setMatLoading] = useState(false);
    const [matExporting, setMatExporting] = useState(false);
    const [matView, setMatView] = useState<'in' | 'out'>('in');

    const fetchChallans = useCallback(async () => {
        try {
            const res = await apiClient.get('/material-receipts/open-challans');
            setChallans(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load pending challans'); }
    }, []);

    const fetchReceipts = useCallback(async () => {
        try {
            const res = await apiClient.get('/material-receipts');
            setReceipts(Array.isArray(res.data) ? res.data : []);
        } catch { toast.error('Failed to load receipts'); }
    }, []);

    const fetchTaxInvoices = useCallback(async () => {
        try {
            const res = await apiClient.get('/vendor-invoices?status=submitted');
            setTaxInvoices(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch { toast.error('Failed to load tax invoices'); }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([fetchChallans(), fetchReceipts(), fetchTaxInvoices()]);
            setLoading(false);
        };
        load();
    }, [fetchChallans, fetchReceipts, fetchTaxInvoices]);

    const fetchMaterialRegister = useCallback(async () => {
        setMatLoading(true);
        try {
            const res = await apiClient.get('/gate-passes/material-register', {
                params: { startDate: matStartDate, endDate: matEndDate }
            });
            setMatData(res.data || { incoming: [], outgoing: [] });
        } catch { toast.error('Failed to load material register'); }
        finally { setMatLoading(false); }
    }, [matStartDate, matEndDate]);

    const handleExportMaterialRegister = async () => {
        setMatExporting(true);
        try {
            const res = await apiClient.get('/gate-passes/material-register/export', {
                params: { startDate: matStartDate, endDate: matEndDate },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Material_Register_${matStartDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Material register exported');
        } catch { toast.error('Export failed'); }
        finally { setMatExporting(false); }
    };

    useEffect(() => {
        if (tab === 'material-register') fetchMaterialRegister();
    }, [tab, fetchMaterialRegister]);

    // ── Open GRN modal ──────────────────────────────────────────────────────────
    const openReceiptModal = (challan: Challan) => {
        setSelectedChallan(challan);
        setVehicle(challan.vehicleNumber || '');
        setDriver(challan.driverName || '');
        setLrNumber('');
        setRemarks('');
        setFormItems(challan.items.map(item => {
            const alreadyReceived = item.receiptItems?.reduce((s, r) => s + r.receivedQty, 0) ?? 0;
            const remaining = Math.max(0, item.quantity - alreadyReceived);
            return {
                challanItemId: item.id,
                partNumber: item.partNumber,
                partDescription: item.partDescription || '',
                expectedQty: remaining,
                receivedQty: remaining,
                shortQty: 0,
                excessQty: 0,
                rejectedAtGate: 0,
                remarks: '',
            };
        }));
        setShowModal(true);
    };

    const updateItem = (idx: number, field: keyof ReceiptFormItem, value: number | string) => {
        setFormItems(prev => {
            const next = [...prev];
            const item = { ...next[idx], [field]: value };
            if (field === 'receivedQty' || field === 'expectedQty') {
                const exp = field === 'expectedQty' ? Number(value) : item.expectedQty;
                const recv = field === 'receivedQty' ? Number(value) : item.receivedQty;
                item.shortQty = recv < exp ? exp - recv : 0;
                item.excessQty = recv > exp ? recv - exp : 0;
            }
            next[idx] = item;
            return next;
        });
    };

    const handleSubmitReceipt = async () => {
        if (!selectedChallan) return;
        setSubmitting(true);
        try {
            await apiClient.post('/material-receipts', {
                vendorId: selectedChallan.vendor.id,
                receiptDate: new Date().toISOString(),
                vehicleNumber: vehicle || undefined,
                driverName: driver || undefined,
                remarks: [lrNumber ? `LR: ${lrNumber}` : '', remarks].filter(Boolean).join(' | ') || undefined,
                items: formItems.map(i => ({
                    challanItemId: i.challanItemId,
                    expectedQty: i.expectedQty,
                    receivedQty: i.receivedQty,
                    shortQty: i.shortQty,
                    excessQty: i.excessQty,
                    rejectedAtGate: i.rejectedAtGate,
                    remarks: i.remarks || undefined,
                })),
            });
            toast.success('GRN created successfully');
            setShowModal(false);
            fetchChallans();
            fetchReceipts();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create GRN');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Open gate-approve modal ─────────────────────────────────────────────────
    const openGateModal = (invoice: TaxInvoice) => {
        setSelectedInvoice(invoice);
        setGateRemarks('');
        setGateItems(invoice.items.map(item => ({
            itemId: item.id,
            partNumber: item.partNumber,
            partDescription: item.partDescription || '',
            invoiceQty: item.invoiceQuantity,
            gateReceivedQty: item.invoiceQuantity,
            gateRemarks: '',
        })));
        setShowGateModal(true);
    };

    const updateGateItem = (idx: number, field: 'gateReceivedQty' | 'gateRemarks', value: number | string) => {
        setGateItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const handleGateApprove = async () => {
        if (!selectedInvoice) return;
        setGateSubmitting(true);
        try {
            await apiClient.post(`/vendor-invoices/${selectedInvoice.id}/gate-approve`, {
                items: gateItems.map(i => ({
                    itemId: i.itemId,
                    gateReceivedQty: i.gateReceivedQty,
                    gateRemarks: i.gateRemarks || undefined,
                })),
                gateRemarks: gateRemarks || undefined,
            });
            toast.success(`Invoice ${selectedInvoice.invoiceNumber} gate-approved. Sent to PPC.`);
            setShowGateModal(false);
            fetchTaxInvoices();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Gate approval failed');
        } finally {
            setGateSubmitting(false);
        }
    };

    // ── Filters ─────────────────────────────────────────────────────────────────
    const filteredChallans = challans.filter(c =>
        c.challanNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.vendor.companyName.toLowerCase().includes(search.toLowerCase()) ||
        (c.poNumber || '').toLowerCase().includes(search.toLowerCase()),
    );

    const filteredReceipts = receipts.filter(r =>
        r.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.vendor.companyName.toLowerCase().includes(search.toLowerCase()),
    );

    const filteredInvoices = taxInvoices.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.vendor.companyName.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="min-h-screen bg-slate-950 p-6 space-y-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                        <PackageCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gate Receipts</h1>
                        <p className="text-slate-400 text-sm">Verify incoming material & generate GRNs</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="bg-slate-800 rounded-lg px-3 py-1.5">
                        <span className="text-purple-400 font-semibold">{taxInvoices.length}</span> invoices
                    </div>
                    <div className="bg-slate-800 rounded-lg px-3 py-1.5">
                        <span className="text-emerald-400 font-semibold">{challans.length}</span> challans
                    </div>
                </div>
            </div>

            {/* ── Search + Tabs ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        placeholder="Search invoice / vendor / challan..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
                    <button
                        onClick={() => setTab('invoices')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'invoices' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <FileText className="w-4 h-4 inline mr-1.5" />
                        Tax Invoices {taxInvoices.length > 0 && <span className="ml-1 bg-purple-500 text-white text-xs rounded-full px-1.5">{taxInvoices.length}</span>}
                    </button>
                    <button
                        onClick={() => setTab('challans')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'challans' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ClipboardList className="w-4 h-4 inline mr-1.5" />
                        Challans ({challans.length})
                    </button>
                    <button
                        onClick={() => setTab('history')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'history' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Eye className="w-4 h-4 inline mr-1.5" />
                        GRN History
                    </button>
                    <button
                        onClick={() => setTab('material-register')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'material-register' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <BookOpen className="w-4 h-4 inline mr-1.5" />
                        Material Register
                    </button>
                </div>
            </div>

            {/* ── Tax Invoices Tab ── */}
            {tab === 'invoices' && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-16 text-slate-500">Loading...</div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-16">
                            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No pending tax invoices</p>
                            <p className="text-slate-600 text-sm mt-1">Submitted vendor invoices will appear here for physical verification</p>
                        </div>
                    ) : (
                        filteredInvoices.map(invoice => {
                            const isExpanded = expandedId === invoice.id;
                            const totalItems = invoice.items.reduce((s, i) => s + i.invoiceQuantity, 0);
                            return (
                                <div key={invoice.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white font-mono">{invoice.invoiceNumber}</span>
                                                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Awaiting Gate Verification</span>
                                                </div>
                                                <p className="text-sm text-slate-400">{invoice.vendor.companyName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-500">Invoice Date</p>
                                                <p className="text-sm text-slate-300">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-500">Total Qty</p>
                                                <p className="text-sm font-semibold text-white">{totalItems.toLocaleString()} units</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-500">Amount</p>
                                                <p className="text-sm font-semibold text-purple-300">₹{invoice.totalAmount.toLocaleString('en-IN')}</p>
                                            </div>
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                                                className="text-slate-500 hover:text-slate-300 p-1"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => openGateModal(invoice)}
                                                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                Verify & Approve
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t border-slate-800 px-4 py-3 bg-slate-900/50">
                                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Invoice Items</p>
                                            <div className="space-y-1">
                                                {invoice.items.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-300 font-mono">{item.partNumber}
                                                            {item.partDescription && <span className="text-slate-500 font-sans ml-2">{item.partDescription}</span>}
                                                        </span>
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <span className="text-slate-400">Qty: <span className="text-white font-semibold">{item.invoiceQuantity}</span></span>
                                                            <span className="text-slate-400">Rate: <span className="text-white">₹{item.unitPrice}</span></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── Pending Challans Tab ── */}
            {tab === 'challans' && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-16 text-slate-500">Loading...</div>
                    ) : filteredChallans.length === 0 ? (
                        <div className="text-center py-16">
                            <PackageCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No pending deliveries</p>
                            <p className="text-slate-600 text-sm mt-1">All challans have been received</p>
                        </div>
                    ) : (
                        filteredChallans.map(challan => {
                            const totalExpected = challan.items.reduce((s, i) => s + i.quantity, 0);
                            const totalReceived = challan.items.reduce((s, i) =>
                                s + (i.receiptItems?.reduce((r, m) => r + m.receivedQty, 0) ?? 0), 0);
                            const isExpanded = expandedId === challan.id;
                            return (
                                <div key={challan.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                                <Truck className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white">{challan.challanNumber}</span>
                                                    {challan.poNumber && (
                                                        <span className="text-xs text-slate-500">PO: {challan.poNumber}</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400">{challan.vendor.companyName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-slate-500">Expected</p>
                                                <p className="text-sm font-semibold text-white">{totalExpected.toLocaleString()} units</p>
                                            </div>
                                            {totalReceived > 0 && (
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-xs text-slate-500">Received</p>
                                                    <p className="text-sm font-semibold text-emerald-400">{totalReceived.toLocaleString()} units</p>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : challan.id)}
                                                className="text-slate-500 hover:text-slate-300 p-1"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => openReceiptModal(challan)}
                                                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Create GRN
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-t border-slate-800 px-4 py-3 bg-slate-900/50">
                                            <p className="text-xs font-medium text-slate-500 uppercase mb-2">Items in this challan</p>
                                            <div className="space-y-2">
                                                {challan.items.map(item => {
                                                    const recv = item.receiptItems?.reduce((s, r) => s + r.receivedQty, 0) ?? 0;
                                                    return (
                                                        <div key={item.id} className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-300">{item.partNumber} — {item.partDescription || 'N/A'}</span>
                                                            <div className="flex items-center gap-3 text-xs">
                                                                <span className="text-slate-500">Challan: <span className="text-white">{item.quantity.toLocaleString()}</span></span>
                                                                {recv > 0 && <span className="text-emerald-400">Rcvd: {recv.toLocaleString()}</span>}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {challan.vehicleNumber && (
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Vehicle: <span className="text-slate-300">{challan.vehicleNumber}</span>
                                                    {challan.driverName && <span className="ml-3">Driver: <span className="text-slate-300">{challan.driverName}</span></span>}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── GRN History Tab ── */}
            {tab === 'history' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="text-center py-16 text-slate-500">Loading...</div>
                    ) : filteredReceipts.length === 0 ? (
                        <div className="text-center py-12">
                            <ClipboardList className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-400">No receipts found</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium">GRN No.</th>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Vendor</th>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Vehicle</th>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Driver</th>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                                    <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">Received By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceipts.map(r => {
                                    const s = RECEIPT_STATUS[r.status] || { label: r.status, color: 'bg-slate-700 text-slate-300' };
                                    return (
                                        <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">{r.receiptNumber}</td>
                                            <td className="px-4 py-3 text-slate-300">{new Date(r.receiptDate).toLocaleDateString('en-IN')}</td>
                                            <td className="px-4 py-3 text-white">{r.vendor.companyName}</td>
                                            <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{r.vehicleNumber || '—'}</td>
                                            <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{r.driverName || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                                                {r.receivedBy ? `${r.receivedBy.firstName} ${r.receivedBy.lastName}` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Material In/Out Register Tab ── */}
            {tab === 'material-register' && (
                <div className="space-y-4">
                    {/* Controls */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">From Date</label>
                            <input
                                type="date"
                                value={matStartDate}
                                onChange={e => setMatStartDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">To Date</label>
                            <input
                                type="date"
                                value={matEndDate}
                                onChange={e => setMatEndDate(e.target.value)}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <button
                            onClick={fetchMaterialRegister}
                            disabled={matLoading}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                            {matLoading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Load Register
                        </button>
                        <button
                            onClick={handleExportMaterialRegister}
                            disabled={matExporting || (matData.incoming.length === 0 && matData.outgoing.length === 0)}
                            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors ml-auto"
                        >
                            <Download className="w-4 h-4" />
                            {matExporting ? 'Exporting...' : 'Download Excel (2 sheets)'}
                        </button>
                    </div>

                    {/* IN / OUT toggle */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setMatView('in')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${matView === 'in' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                Material IN
                                <span className="ml-1 bg-purple-500/40 px-1.5 rounded-full text-xs">{matData.incoming.length}</span>
                            </button>
                            <button
                                onClick={() => setMatView('out')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${matView === 'out' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <ArrowUpFromLine className="w-4 h-4" />
                                Material OUT
                                <span className="ml-1 bg-emerald-500/40 px-1.5 rounded-full text-xs">{matData.outgoing.length}</span>
                            </button>
                        </div>
                    </div>

                    {/* Material IN Table */}
                    {matView === 'in' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
                                <ArrowDownToLine className="w-4 h-4 text-purple-400" />
                                <span className="text-purple-400 font-semibold">Material Inward Register</span>
                                <span className="text-slate-500 text-xs ml-1">(Gate-Approved Tax Invoices)</span>
                            </div>
                            {matLoading ? (
                                <div className="text-center py-10 text-slate-400">Loading...</div>
                            ) : matData.incoming.length === 0 ? (
                                <div className="text-center py-10">
                                    <ArrowDownToLine className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-400">No inward material for selected dates</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left">#</th>
                                                <th className="px-4 py-3 text-left">Date</th>
                                                <th className="px-4 py-3 text-left">Invoice #</th>
                                                <th className="px-4 py-3 text-left">Vendor</th>
                                                <th className="px-4 py-3 text-left">Part No.</th>
                                                <th className="px-4 py-3 text-left hidden md:table-cell">Description</th>
                                                <th className="px-4 py-3 text-right">Inv Qty</th>
                                                <th className="px-4 py-3 text-right">Rcvd Qty</th>
                                                <th className="px-4 py-3 text-right hidden lg:table-cell">Rate (₹)</th>
                                                <th className="px-4 py-3 text-left hidden lg:table-cell">Gate By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {matData.incoming.flatMap((inv: any, invIdx: number) =>
                                                inv.items.map((item: any, itemIdx: number) => (
                                                    <tr key={`${inv.id}-${item.partNumber}-${itemIdx}`} className={`hover:bg-slate-800/30 transition-colors ${invIdx % 2 === 0 ? '' : 'bg-slate-900/50'}`}>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">{invIdx + 1}.{itemIdx + 1}</td>
                                                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{inv.gateApprovedAt ? new Date(inv.gateApprovedAt).toLocaleDateString('en-IN') : '—'}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-purple-400">{inv.invoiceNumber}</td>
                                                        <td className="px-4 py-3 text-white text-sm">{inv.vendor?.companyName}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-indigo-300">{item.partNumber}</td>
                                                        <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{item.partDescription || '—'}</td>
                                                        <td className="px-4 py-3 text-right text-slate-300">{item.invoiceQuantity}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-semibold ${(item.gateReceivedQty ?? item.invoiceQuantity) === item.invoiceQuantity ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                                {item.gateReceivedQty ?? item.invoiceQuantity}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-slate-400 hidden lg:table-cell">₹{item.unitPrice?.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{inv.gateApprovedBy ? `${inv.gateApprovedBy.firstName} ${inv.gateApprovedBy.lastName}` : '—'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Material OUT Table */}
                    {matView === 'out' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800">
                                <ArrowUpFromLine className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Material Outward Register</span>
                                <span className="text-slate-500 text-xs ml-1">(Delivery Challans)</span>
                            </div>
                            {matLoading ? (
                                <div className="text-center py-10 text-slate-400">Loading...</div>
                            ) : matData.outgoing.length === 0 ? (
                                <div className="text-center py-10">
                                    <ArrowUpFromLine className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                                    <p className="text-slate-400">No outward material for selected dates</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase">
                                            <tr>
                                                <th className="px-4 py-3 text-left">#</th>
                                                <th className="px-4 py-3 text-left">Date</th>
                                                <th className="px-4 py-3 text-left">Challan #</th>
                                                <th className="px-4 py-3 text-left">Vendor (Job Work)</th>
                                                <th className="px-4 py-3 text-left hidden md:table-cell">Customer</th>
                                                <th className="px-4 py-3 text-left">Part No.</th>
                                                <th className="px-4 py-3 text-left hidden md:table-cell">Description</th>
                                                <th className="px-4 py-3 text-right">Qty</th>
                                                <th className="px-4 py-3 text-left hidden lg:table-cell">Vehicle</th>
                                                <th className="px-4 py-3 text-left hidden lg:table-cell">Issued By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {matData.outgoing.flatMap((challan: any, cIdx: number) =>
                                                challan.items.map((item: any, itemIdx: number) => (
                                                    <tr key={`${challan.id}-${item.partNumber}-${itemIdx}`} className={`hover:bg-slate-800/30 transition-colors ${cIdx % 2 === 0 ? '' : 'bg-slate-900/50'}`}>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">{cIdx + 1}.{itemIdx + 1}</td>
                                                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(challan.challanDate).toLocaleDateString('en-IN')}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-emerald-400">{challan.challanNumber}</td>
                                                        <td className="px-4 py-3 text-white text-sm">{challan.vendor?.companyName}</td>
                                                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{challan.customer?.companyName}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-indigo-300">{item.partNumber}</td>
                                                        <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">{item.partDescription || '—'}</td>
                                                        <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{item.quantityIssued}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{challan.vehicleNumber || '—'}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">{challan.createdBy ? `${challan.createdBy.firstName} ${challan.createdBy.lastName}` : '—'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Gate Approval Modal (Tax Invoice) ── */}
            {showGateModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                                    Gate Verification
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Invoice: <span className="text-purple-400 font-mono">{selectedInvoice.invoiceNumber}</span>
                                    {' · '}{selectedInvoice.vendor.companyName}
                                </p>
                            </div>
                            <button onClick={() => setShowGateModal(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">
                                    Match the physical items brought by the driver against this tax invoice.
                                    Enter the actual quantity received for each item.
                                </p>
                            </div>

                            {/* Item verification */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-300 mb-3">Verify Items</h3>
                                <div className="space-y-3">
                                    {gateItems.map((item, idx) => {
                                        const diff = item.gateReceivedQty - item.invoiceQty;
                                        return (
                                            <div key={item.itemId} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <span className="font-mono text-sm text-white">{item.partNumber}</span>
                                                        {item.partDescription && <span className="text-slate-400 text-xs ml-2">{item.partDescription}</span>}
                                                    </div>
                                                    <span className="text-xs text-slate-500">Invoice qty: <span className="text-white font-semibold">{item.invoiceQty}</span></span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3 items-end">
                                                    <div className="col-span-1">
                                                        <label className="block text-xs text-slate-500 mb-1">Received Qty *</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                                                            value={item.gateReceivedQty}
                                                            onChange={e => updateGateItem(idx, 'gateReceivedQty', Number(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 flex items-center">
                                                        {diff < 0 && (
                                                            <span className="text-xs font-semibold text-red-400 flex items-center gap-1">
                                                                <AlertTriangle className="w-3.5 h-3.5" /> Short {Math.abs(diff)}
                                                            </span>
                                                        )}
                                                        {diff > 0 && (
                                                            <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1">
                                                                <AlertTriangle className="w-3.5 h-3.5" /> Excess {diff}
                                                            </span>
                                                        )}
                                                        {diff === 0 && item.gateReceivedQty > 0 && (
                                                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> Match
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="block text-xs text-slate-500 mb-1">Remarks</label>
                                                        <input
                                                            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                                                            placeholder="Optional..."
                                                            value={item.gateRemarks}
                                                            onChange={e => updateGateItem(idx, 'gateRemarks', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* General gate remarks */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Gate Remarks</label>
                                <textarea
                                    rows={2}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                                    placeholder="Any gate-level observations..."
                                    value={gateRemarks}
                                    onChange={e => setGateRemarks(e.target.value)}
                                />
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <p className="text-xs text-blue-300">
                                    After gate approval, this invoice will be sent to <strong>PPC</strong> for final approval before stock is updated.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
                            <button
                                onClick={() => setShowGateModal(false)}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGateApprove}
                                disabled={gateSubmitting}
                                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                            >
                                {gateSubmitting ? (
                                    <><Clock className="w-4 h-4 animate-spin" /> Approving...</>
                                ) : (
                                    <><ShieldCheck className="w-4 h-4" /> Gate Approve & Send to PPC</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── New GRN Modal (challan-based) ── */}
            {showModal && selectedChallan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <div>
                                <h2 className="text-lg font-bold text-white">New Gate Receipt</h2>
                                <p className="text-sm text-slate-400">
                                    Challan: <span className="text-emerald-400 font-mono">{selectedChallan.challanNumber}</span>
                                    {' · '}{selectedChallan.vendor.companyName}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle Number</label>
                                    <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" placeholder="MH-12-AB-1234" value={vehicle} onChange={e => setVehicle(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Driver Name</label>
                                    <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" placeholder="Driver name" value={driver} onChange={e => setDriver(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">LR / Docket No.</label>
                                    <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" placeholder="LR number" value={lrNumber} onChange={e => setLrNumber(e.target.value)} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-300 mb-2">Verify Quantities</h3>
                                <div className="space-y-3">
                                    {formItems.map((item, idx) => (
                                        <div key={item.challanItemId} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <span className="font-mono text-sm text-white">{item.partNumber}</span>
                                                    {item.partDescription && <span className="text-slate-400 text-xs ml-2">{item.partDescription}</span>}
                                                </div>
                                                <span className="text-xs text-slate-500">Challan qty: {item.expectedQty}</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Received Qty *</label>
                                                    <input type="number" min="0" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" value={item.receivedQty} onChange={e => updateItem(idx, 'receivedQty', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Rejected at Gate</label>
                                                    <input type="number" min="0" className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500" value={item.rejectedAtGate} onChange={e => updateItem(idx, 'rejectedAtGate', Number(e.target.value))} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Short</label>
                                                    <div className={`px-2 py-1.5 rounded text-sm font-semibold ${item.shortQty > 0 ? 'bg-red-900/30 text-red-400' : 'bg-slate-700 text-slate-500'}`}>{item.shortQty}</div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">Excess</label>
                                                    <div className={`px-2 py-1.5 rounded text-sm font-semibold ${item.excessQty > 0 ? 'bg-yellow-900/30 text-yellow-400' : 'bg-slate-700 text-slate-500'}`}>{item.excessQty}</div>
                                                </div>
                                            </div>
                                            {(item.shortQty > 0 || item.excessQty > 0) && (
                                                <input className="mt-2 w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none" placeholder="Reason for discrepancy..." value={item.remarks} onChange={e => updateItem(idx, 'remarks', e.target.value)} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">General Remarks</label>
                                <textarea rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none" placeholder="Any additional notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                            </div>

                            {formItems.some(i => i.shortQty > 0 || i.excessQty > 0) && (
                                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-yellow-300">Quantity discrepancies detected. The GRN will be created with <strong>Pending Inspection</strong> status.</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-800">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleSubmitReceipt} disabled={submitting} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                                {submitting ? <><Clock className="w-4 h-4 animate-spin" /> Creating GRN...</> : <><CheckCircle2 className="w-4 h-4" /> Confirm & Create GRN</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
