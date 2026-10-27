'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Building2, CreditCard, ChevronLeft } from 'lucide-react';

interface ChallanItem {
    id: string;
    partNumber: string;
    partDescription?: string;
    hsnCode?: string;
    quantityIssued: number;
    unitPrice?: number;
    invoicedQty: number;
    availableQty: number;
    rate: number;
}

interface Challan {
    id: string;
    challanNumber: string;
    challanDate: string;
    customer: {
        id: string;
        companyName: string;
        gstin?: string;
        address?: string;
    };
    items: ChallanItem[];
}

interface InvoiceItem {
    challanItemId: string;
    invoiceQuantity: number;
}

interface VendorProfile {
    companyName: string;
    gstin: string;
    address: string;
    logoUrl: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    contactEmail: string;
    contactPhone: string;
}

export default function CreateInvoicePage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [challans, setChallans] = useState<Challan[]>([]);
    const [selectedChallanId, setSelectedChallanId] = useState<string>('');
    const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
    const [overrideRates, setOverrideRates] = useState<Map<string, number>>(new Map());

    // Vendor Profile for Preview
    const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchAvailableChallans();
        fetchVendorProfile();
    }, [user]);

    const fetchVendorProfile = async () => {
        if (!user?.vendorId) return;
        try {
            const res = await apiClient.get(`/vendors/${user.vendorId}`);
            setVendorProfile(res.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    };

    const fetchAvailableChallans = async () => {
        try {
            const res = await apiClient.get('/vendor-invoices/available-challans');
            setChallans(res.data);
        } catch (error) {
            console.error('Failed to fetch challans:', error);
        }
    };

    const handleChallanSelect = async (challanId: string) => {
        setSelectedChallanId(challanId);
        setSelectedItems(new Map());

        if (!challanId) {
            setSelectedChallan(null);
            return;
        }

        try {
            const res = await apiClient.get(`/vendor-invoices/challan/${challanId}`);
            setSelectedChallan(res.data);
            // Initialize override rates with values from the API
            const initRates = new Map<string, number>();
            (res.data.items || []).forEach((item: ChallanItem) => {
                initRates.set(item.id, item.rate);
            });
            setOverrideRates(initRates);
        } catch (error) {
            console.error('Failed to fetch challan details:', error);
            toast.error('Failed to load challan details');
        }
    };

    const handleItemQuantityChange = (itemId: string, quantity: number) => {
        const newMap = new Map(selectedItems);
        const item = selectedChallan?.items.find(i => i.id === itemId);

        if (item && quantity > item.availableQty) {
            toast.error(`Quantity cannot exceed available quantity (${item.availableQty})`);
            return;
        }

        if (quantity > 0) {
            newMap.set(itemId, quantity);
        } else {
            newMap.delete(itemId);
        }
        setSelectedItems(newMap);
    };

    const calculateTotals = () => {
        if (!selectedChallan) return { subtotal: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };

        let subtotal = 0;
        selectedItems.forEach((qty, itemId) => {
            const item = selectedChallan.items.find(i => i.id === itemId);
            if (item) {
                const rate = overrideRates.get(itemId) ?? item.rate;
                subtotal += qty * rate;
            }
        });

        // Simplified GST Logic (IGST vs CGST+SGST)
        // Hardcoded Intra-state (CGST+SGST) for MVP unless state differs
        // Ideally compare vendor.state and customer.state

        // Let's assume SGST/CGST 9% each for now (18% Total)
        // This should be dynamic based on HSNC or global setting
        const gstRate = 0.18;
        const gstAmount = subtotal * gstRate;
        const cgst = gstAmount / 2;
        const sgst = gstAmount / 2;
        const igst = 0; // Logic to check state can be added here

        const total = subtotal + gstAmount;

        return { subtotal, cgst, sgst, igst, total };
    };

    const handleSubmit = async () => {
        if (!invoiceNumber || !selectedChallanId || selectedItems.size === 0) {
            toast.error('Please fill all required fields and select at least one item');
            return;
        }

        if (!vendorProfile?.bankName || !vendorProfile?.logoUrl) {
            toast('Your profile is incomplete (missing logo or bank details). Invoice will be created anyway.', { icon: '⚠️' });
        }

        setLoading(true);
        try {
            const items = Array.from(selectedItems.entries()).map(([challanItemId, invoiceQuantity]) => {
                const rate = overrideRates.get(challanItemId);
                return {
                    challanItemId,
                    invoiceQuantity,
                    ...(rate !== undefined && rate > 0 ? { unitPrice: rate } : {})
                };
            });

            await apiClient.post('/vendor-invoices', {
                invoiceNumber,
                invoiceDate: new Date(invoiceDate),
                customerId: selectedChallan?.customer.id,
                remarks,
                items
            });

            toast.success('Invoice created successfully!');
            router.push('/dashboard/vendor/invoices');
        } catch (error: any) {
            console.error('Failed to create invoice:', error);
            toast.error(error.response?.data?.message || 'Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => router.back()}>
                        <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </Button>
                    <h1 className="text-3xl font-bold text-white">Generate Tax Invoice</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT PANEL: INPUT FORM */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-mono text-sm">01</span>
                                Invoice Details
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="invoiceNumber" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Invoice Number</label>
                                    <Input
                                        id="invoiceNumber"
                                        value={invoiceNumber}
                                        onChange={(e) => setInvoiceNumber(e.target.value)}
                                        placeholder="INV-2026-001"
                                        className="bg-slate-950/50 border-slate-700 text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="invoiceDate" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Invoice Date</label>
                                    <Input
                                        id="invoiceDate"
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="bg-slate-950/50 border-slate-700 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select Challan</label>
                                    <select
                                        value={selectedChallanId}
                                        onChange={(e) => handleChallanSelect(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">-- Select Challan --</option>
                                        {challans.map(c => (
                                            <option key={c.id} value={c.id}>{c.challanNumber} - {c.customer.companyName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </Card>

                        {/* ITEMS SELECTION (ONLY IF CHALLAN SELECTED) */}
                        {selectedChallan && (
                            <Card className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-mono text-sm">02</span>
                                    Select Items
                                </h3>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedChallan.items.map(item => (
                                        <div key={item.id} className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="text-emerald-400 font-mono font-bold text-sm">{item.partNumber}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{item.partDescription}</div>
                                                </div>
                                                <div className="text-right">
                                                    {item.rate > 0 ? (
                                                        <div className="text-xs text-emerald-400 font-semibold">₹{item.rate.toFixed(2)}/pc</div>
                                                    ) : (
                                                        <div>
                                                            <div className="text-xs text-amber-400 mb-1">No PO rate — enter manually:</div>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={overrideRates.get(item.id) || ''}
                                                                onChange={e => {
                                                                    const newRates = new Map(overrideRates);
                                                                    newRates.set(item.id, parseFloat(e.target.value) || 0);
                                                                    setOverrideRates(newRates);
                                                                }}
                                                                className="w-24 bg-slate-800 border border-amber-500/50 text-white rounded px-2 py-1 text-xs text-right font-mono"
                                                                placeholder="₹/pc"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-slate-400">Avail: <span className="text-emerald-400">{item.availableQty}</span></div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-slate-500">Invoice Qty:</span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={item.availableQty}
                                                    value={selectedItems.get(item.id) || ''}
                                                    onChange={e => handleItemQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                                    className="h-8 bg-slate-900 border-slate-700 text-white text-right font-mono"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* RIGHT PANEL: PREVIEW */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white text-slate-900 shadow-2xl h-full flex flex-col">
                            {/* INVOICE PREVIEW HEADER */}
                            <div className="p-8 border-b border-slate-200">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                        {vendorProfile?.logoUrl ? (
                                            <img src={vendorProfile.logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                                        ) : (
                                            <div className="h-16 w-16 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs text-center border border-dashed border-slate-300">
                                                No Logo
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">{vendorProfile?.companyName || 'Your Company Name'}</h2>
                                            <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                                                <p>{vendorProfile?.address || 'Address Line 1'}</p>
                                                <p>{vendorProfile?.contactEmail} • {vendorProfile?.contactPhone}</p>
                                                <p className="font-mono text-xs mt-1">GSTIN: {vendorProfile?.gstin || '----------------'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-extrabold text-slate-200 uppercase tracking-widest">Invoice</div>
                                        <div className="mt-4 space-y-1">
                                            <div className="text-sm font-bold text-slate-700">Has #: <span className="font-mono text-slate-900">{invoiceNumber || '________'}</span></div>
                                            <div className="text-sm text-slate-500">Date: {invoiceDate}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BILL TO */}
                            <div className="p-8 grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</h4>
                                    {selectedChallan ? (
                                        <div className="text-sm text-slate-700">
                                            <p className="font-bold text-lg text-slate-900">{selectedChallan.customer.companyName}</p>
                                            <p>{selectedChallan.customer.address || 'Customer Address'}</p>
                                            <p className="mt-1 font-mono text-xs">GSTIN: {selectedChallan.customer.gstin || 'N/A'}</p>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-300 italic">Select a challan to view customer details</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Ref Challan</h4>
                                    <p className="text-sm font-mono font-bold text-slate-700">{selectedChallan?.challanNumber || '-'}</p>
                                    <p className="text-xs text-slate-500">{selectedChallan ? new Date(selectedChallan.challanDate).toLocaleDateString() : ''}</p>
                                </div>
                            </div>

                            {/* TABLE */}
                            <div className="flex-1 bg-slate-50/50 p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-500 uppercase text-xs font-bold">
                                        <tr>
                                            <th className="px-8 py-3 w-16">#</th>
                                            <th className="px-4 py-3">Item Description</th>
                                            <th className="px-4 py-3 text-right">Qty</th>
                                            <th className="px-4 py-3 text-right">Rate</th>
                                            <th className="px-8 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {selectedItems.size > 0 ? Array.from(selectedItems.entries()).map(([itemId, qty], idx) => {
                                            const item = selectedChallan?.items.find(i => i.id === itemId);
                                            if (!item) return null;
                                            return (
                                                <tr key={itemId}>
                                                    <td className="px-8 py-4 text-slate-400 font-mono">{idx + 1}</td>
                                                    <td className="px-4 py-4 font-medium text-slate-900">
                                                        {item.partNumber}
                                                        <div className="text-slate-500 text-xs font-normal">{item.partDescription}</div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">{qty}</td>
                                                    <td className="px-4 py-4 text-right">₹{item.rate}</td>
                                                    <td className="px-8 py-4 text-right font-bold">₹{(qty * item.rate).toFixed(2)}</td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 italic">
                                                    No items selected
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* FOOTER / TOTALS */}
                            <div className="p-8 bg-slate-50 border-t border-slate-200">
                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                            <Building2 className="w-4 h-4" /> Bank Details
                                        </h4>
                                        <div className="bg-white border border-slate-200 rounded p-3 text-xs text-slate-600 space-y-1">
                                            <p><span className="font-semibold text-slate-800">Bank:</span> {vendorProfile?.bankName || '-'}</p>
                                            <p><span className="font-semibold text-slate-800">A/C No:</span> {vendorProfile?.accountNumber || '-'}</p>
                                            <p><span className="font-semibold text-slate-800">IFSC:</span> {vendorProfile?.ifscCode || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-slate-500 text-sm">
                                            <span>Subtotal</span>
                                            <span>₹{totals.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 text-sm">
                                            <span>CGST (9%)</span>
                                            <span>₹{totals.cgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500 text-sm">
                                            <span>SGST (9%)</span>
                                            <span>₹{totals.sgst.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-900 text-xl font-bold pt-3 border-t border-slate-200 mt-2">
                                            <span>Total (INR)</span>
                                            <span>₹{totals.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900 flex justify-end">
                                <Button
                                    onClick={handleSubmit}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 shadow-lg shadow-emerald-900/50"
                                    disabled={loading || selectedItems.size === 0}
                                >
                                    {loading ? 'Generating...' : 'Confirm & Generate Invoice'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
