'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Check, ChevronsUpDown, Plus, Trash2, ArrowLeft, Loader2, Truck, Package, FileText, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface ChallanItem {
    id: number;
    partNumber: string;
    partDescription: string;
    hsnCode: string;
    poItemId?: string;
    quantityIssued: number;
    unitOfMeasure: string;
    materialGrade: string;
    drawingReference: string;
    unitPrice: number;
    totalAmount: number;
    operations: string[];
}

const emptyItem = (): ChallanItem => ({
    id: Date.now(),
    partNumber: '',
    partDescription: '',
    hsnCode: '',
    quantityIssued: 1,
    unitOfMeasure: 'NOS',
    materialGrade: '',
    drawingReference: '',
    unitPrice: 0,
    totalAmount: 0,
    operations: [],
});

export default function CreateChallanPage() {
    const router = useRouter();
    const { user } = useAuthStore();

    const [submitting, setSubmitting] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    // Master data
    const [vendors, setVendors] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [availableParts, setAvailableParts] = useState<any[]>([]);
    const [orgDetails, setOrgDetails] = useState<any>(null);
    const [plants, setPlants] = useState<any[]>([]);
    const [selectedPlantId, setSelectedPlantId] = useState<string>('');

    // Editable consignor fields (pre-filled from org but overridable)
    const [consignorName, setConsignorName] = useState('');
    const [consignorAddress, setConsignorAddress] = useState('');
    const [consignorGstin, setConsignorGstin] = useState('');

    // Form state — header
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [openCustomerCombo, setOpenCustomerCombo] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [selectedPo, setSelectedPo] = useState<any>(null);
    const [pos, setPos] = useState<any[]>([]);
    const [challanDate, setChallanDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [copyType, setCopyType] = useState('Original');
    const [remarks, setRemarks] = useState('');

    // Transport
    const [transportMode, setTransportMode] = useState('Road');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [transporterName, setTransporterName] = useState('');
    const [ewayBillNumber, setEwayBillNumber] = useState('');
    const [ewayBillDate, setEwayBillDate] = useState('');

    // Items
    const [items, setItems] = useState<ChallanItem[]>([emptyItem()]);

    // UI
    const [openVendorCombo, setOpenVendorCombo] = useState(false);
    const [vendorSearch, setVendorSearch] = useState('');
    const [openPoCombo, setOpenPoCombo] = useState(false);
    const [poSearch, setPoSearch] = useState('');
    const [openPartCombo, setOpenPartCombo] = useState<Record<number, boolean>>({});
    const [partSearch, setPartSearch] = useState<Record<number, string>>({});

    // Load vendors, parts, org details on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [vendorRes, partsRes, orgRes, customerRes] = await Promise.allSettled([
                    apiClient.get('/vendors', { params: { limit: 200, status: 'approved' } }),
                    apiClient.get('/parts'),
                    apiClient.get('/organizations/mine'),
                    apiClient.get('/customers', { params: { limit: 100 } }),
                ]);
                if (vendorRes.status === 'fulfilled') setVendors(vendorRes.value.data.data || vendorRes.value.data || []);
                if (partsRes.status === 'fulfilled') setAvailableParts(partsRes.value.data.data || partsRes.value.data || []);
                if (customerRes.status === 'fulfilled') {
                    const list = customerRes.value.data.data || customerRes.value.data || [];
                    setCustomers(list);
                    // Auto-select if only one customer
                    if (list.length === 1) setSelectedCustomer(list[0]);
                }
                if (orgRes.status === 'fulfilled') {
                    const org = orgRes.value.data;
                    setOrgDetails(org);

                    if (org.plants && Array.isArray(org.plants) && org.plants.length > 0) {
                        setPlants(org.plants);
                        setSelectedPlantId(org.plants[0].id);
                        const p = org.plants[0];
                        setConsignorName(p.name || org.name || '');
                        setConsignorAddress([p.address, p.city, p.state].filter(Boolean).join(', '));
                        setConsignorGstin(p.gstin || '');
                    } else {
                        setConsignorName(org.name || '');
                        setConsignorAddress([org.address, org.city, org.state].filter(Boolean).join(', '));
                        setConsignorGstin(org.gstin || '');
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setPageLoading(false);
            }
        };
        load();
    }, []);

    // Load APPROVED POs when vendor changes
    useEffect(() => {
        if (!selectedVendor) { setPos([]); setSelectedPo(null); return; }
        const fetchPos = async () => {
            try {
                const res = await apiClient.get('/purchase-orders', {
                    params: { vendorId: selectedVendor.id, status: 'approved' },
                });
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setPos(data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchPos();
    }, [selectedVendor]);

    const handleVendorSelect = (v: any) => {
        setSelectedVendor(v);
        setSelectedPo(null);
        setItems([emptyItem()]);
        setVendorSearch('');
        setOpenVendorCombo(false);
    };

    const handlePoSelect = async (poId: string) => {
        if (!poId) { setSelectedPo(null); setItems([emptyItem()]); return; }
        const po = pos.find(p => p.id === poId);
        if (!po) return;
        setSelectedPo(po);
        try {
            const res = await apiClient.get(`/purchase-orders/${poId}`);
            const fullPo = res.data;
            if (fullPo.items?.length) {
                setItems(fullPo.items.map((item: any, i: number) => ({
                    id: i + 1,
                    partNumber: item.partNumber || '',
                    partDescription: item.partDescription || '',
                    hsnCode: item.hsnCode || '',
                    poItemId: item.id,
                    quantityIssued: item.quantity || 1,
                    unitOfMeasure: item.unitOfMeasure || 'NOS',
                    materialGrade: item.materialGrade || '',
                    drawingReference: item.drawingNumber || '',
                    unitPrice: item.ratePerPiece || 0,
                    totalAmount: (item.quantity || 1) * (item.ratePerPiece || 0),
                    operations: item.operations || [],
                })));
                toast.success(`${fullPo.items.length} item(s) loaded from PO`);
            }
        } catch (e) {
            toast.error('Could not load PO items');
        }
    };

    const updateItem = (id: number, field: keyof ChallanItem, value: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };

            if (field === 'partNumber') {
                const part = availableParts.find(p => p.partNumber === value || p.partName === value);
                if (part) {
                    updated.partDescription = part.partName || part.description || '';
                    updated.hsnCode = part.hsnCode || '';
                    updated.materialGrade = part.materialGrade || '';
                    updated.drawingReference = part.drawingNumber || '';
                    updated.unitOfMeasure = part.unitOfMeasure || 'NOS';
                }
            }

            if (field === 'quantityIssued' || field === 'unitPrice') {
                updated.totalAmount = (Number(field === 'quantityIssued' ? value : updated.quantityIssued) || 0) *
                    (Number(field === 'unitPrice' ? value : updated.unitPrice) || 0);
            }

            return updated;
        }));
    };

    const handlePartSelect = (itemId: number, part: any) => {
        setItems(prev => prev.map(item => {
            if (item.id !== itemId) return item;
            return {
                ...item,
                partNumber: part.partNumber,
                partDescription: part.partName || part.description || '',
                hsnCode: part.hsnCode || '',
                materialGrade: part.materialGrade || '',
                drawingReference: part.drawingNumber || '',
                unitOfMeasure: part.unitOfMeasure || 'NOS',
                totalAmount: item.quantityIssued * item.unitPrice,
            };
        }));
        setOpenPartCombo(prev => ({ ...prev, [itemId]: false }));
    };

    const totals = items.reduce((acc, i) => ({
        qty: acc.qty + (Number(i.quantityIssued) || 0),
        amount: acc.amount + (Number(i.totalAmount) || 0),
    }), { qty: 0, amount: 0 });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) { toast.error('Please select a customer (Eaton, TATA, etc.)'); return; }
        if (!selectedVendor) { toast.error('Please select a vendor'); return; }
        if (items.some(i => !i.partNumber || !i.quantityIssued)) {
            toast.error('Each line item needs a part number and quantity'); return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                customerId: selectedCustomer.id,
                vendorId: selectedVendor.id,
                challanDate,
                copyType,
                ...(remarks && { remarks }),
                ...(transportMode && { transportMode }),
                ...(vehicleNumber && { vehicleNumber }),
                ...(driverName && { driverName }),
                ...(driverPhone && { driverPhone }),
                ...(transporterName && { transporterName }),
                ...(ewayBillNumber && { ewayBillNumber }),
                ...(ewayBillDate && { ewayBillDate }),
                ...(selectedPo && { poId: selectedPo.id, poNumber: selectedPo.poNumber }),
                ...(selectedPlantId && plants.length > 0 && { issuerDetails: plants.find((p: any) => p.id === selectedPlantId) }),
                items: items.map(i => ({
                    partNumber: i.partNumber,
                    quantityIssued: Number(i.quantityIssued),
                    ...(i.partDescription && { partDescription: i.partDescription }),
                    ...(i.hsnCode && { hsnCode: i.hsnCode }),
                    ...(i.unitOfMeasure && { unitOfMeasure: i.unitOfMeasure }),
                    ...(i.materialGrade && { materialGrade: i.materialGrade }),
                    ...(i.drawingReference && { drawingReference: i.drawingReference }),
                    ...(i.unitPrice && { unitPrice: Number(i.unitPrice) }),
                    ...(i.totalAmount && { totalAmount: Number(i.totalAmount) }),
                    ...(i.poItemId && { poItemId: i.poItemId }),
                })),
            };

            const res = await apiClient.post('/challans', payload);
            toast.success(`Challan ${res.data.challanNumber} created`);
            router.push('/dashboard/challans');
        } catch (err: any) {
            const msg = err.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Failed to create challan'));
        } finally {
            setSubmitting(false);
        }
    };

    if (pageLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    return (
        <div className="container mx-auto py-8 max-w-6xl">
            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/challans')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">New Delivery Challan</h1>
                    <p className="text-sm text-muted-foreground">Job Work — Rule 45/55 CGST Rules 2017</p>
                </div>
                <div className="ml-auto flex gap-2">
                    {['Original', 'Duplicate', 'Triplicate'].map(t => (
                        <button key={t} type="button"
                            onClick={() => setCopyType(t)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${copyType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-600 hover:border-indigo-400'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Party Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* From — Consignor */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <Package className="h-4 w-4" /> From (Consignor)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {plants.length > 0 && (
                                <div className="space-y-1.5 mb-4">
                                    <Label className="text-xs text-indigo-600 font-semibold">Dispatching From (Plant) *</Label>
                                    <Select
                                        value={selectedPlantId}
                                        onValueChange={(val) => {
                                            setSelectedPlantId(val);
                                            const p = plants.find((p: any) => p.id === val);
                                            if (p) {
                                                setConsignorName(p.name || orgDetails?.name || '');
                                                setConsignorAddress([p.address, p.city, p.state].filter(Boolean).join(', '));
                                                setConsignorGstin(p.gstin || '');
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="border-indigo-200 bg-indigo-50">
                                            <SelectValue placeholder="Select dispatch plant" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {plants.map((p: any) => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-xs">Company Name *</Label>
                                <Input
                                    value={consignorName}
                                    onChange={e => setConsignorName(e.target.value)}
                                    placeholder="Your company name"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Address</Label>
                                <Input
                                    value={consignorAddress}
                                    onChange={e => setConsignorAddress(e.target.value)}
                                    placeholder="Address, City, State"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">GSTIN</Label>
                                <Input
                                    value={consignorGstin}
                                    onChange={e => setConsignorGstin(e.target.value.toUpperCase())}
                                    placeholder="27XXXXX0000X1Z5"
                                    className="font-mono"
                                />
                            </div>
                            {!orgDetails && (
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                    ⚠ Could not auto-fetch org details — please fill manually
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* To — Consignee */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                <Truck className="h-4 w-4" /> To (Consignee / Vendor)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Customer selector */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">OEM Customer (for whose order) *</Label>
                                <Popover open={openCustomerCombo} onOpenChange={v => { setOpenCustomerCombo(v); if (!v) setCustomerSearch(''); }}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className={`w-full justify-between ${!selectedCustomer ? 'border-amber-400 text-amber-600' : ''}`}>
                                            {selectedCustomer ? `${selectedCustomer.companyName}${selectedCustomer.code ? ` (${selectedCustomer.code})` : ''}` : 'Select Customer...'}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                        <Command shouldFilter={false}>
                                            <CommandInput
                                                placeholder="Search customer..."
                                                value={customerSearch}
                                                onValueChange={setCustomerSearch}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No customers found.</CommandEmpty>
                                                <CommandGroup>
                                                    {customers
                                                        .filter(c =>
                                                            !customerSearch ||
                                                            c.companyName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                            c.code?.toLowerCase().includes(customerSearch.toLowerCase())
                                                        )
                                                        .map(c => (
                                                            <CommandItem
                                                                key={c.id}
                                                                value={c.id}
                                                                onSelect={() => {
                                                                    setSelectedCustomer(c);
                                                                    setCustomerSearch('');
                                                                    setOpenCustomerCombo(false);
                                                                }}
                                                                className="cursor-pointer"
                                                            >
                                                                <Check className={cn('mr-2 h-4 w-4', selectedCustomer?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                                                                <div>
                                                                    <p className="font-medium">{c.companyName}</p>
                                                                    {c.code && <p className="text-xs text-muted-foreground">{c.code}</p>}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {customers.length === 0 && (
                                    <p className="text-xs text-red-500">⚠ No customers found. Add a customer first before creating challans.</p>
                                )}
                            </div>

                            <Popover open={openVendorCombo} onOpenChange={v => { setOpenVendorCombo(v); if (!v) setVendorSearch(''); }}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {selectedVendor ? `${selectedVendor.companyName} (${selectedVendor.vendorCode})` : 'Select Vendor...'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Type to search vendor..."
                                            value={vendorSearch}
                                            onValueChange={setVendorSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>No vendors found.</CommandEmpty>
                                            <CommandGroup>
                                                {vendors
                                                    .filter(v =>
                                                        !vendorSearch ||
                                                        v.companyName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                                                        v.vendorCode?.toLowerCase().includes(vendorSearch.toLowerCase())
                                                    )
                                                    .map(v => (
                                                        <CommandItem key={v.id} value={v.id} onSelect={() => handleVendorSelect(v)} className="cursor-pointer">
                                                            <Check className={cn('mr-2 h-4 w-4', selectedVendor?.id === v.id ? 'opacity-100' : 'opacity-0')} />
                                                            <div>
                                                                <p className="font-medium">{v.companyName}</p>
                                                                <p className="text-xs text-muted-foreground">{v.vendorCode}</p>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {selectedVendor && (
                                <div className="text-sm space-y-1 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <p className="font-semibold">{selectedVendor.companyName}</p>
                                    {selectedVendor.address && <p className="text-muted-foreground text-xs">{selectedVendor.address}</p>}
                                    {selectedVendor.gstin && <p className="font-mono text-xs text-indigo-600">GSTIN: {selectedVendor.gstin}</p>}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Challan Header */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Challan Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label>Challan Date *</Label>
                            <Input type="date" value={challanDate} onChange={e => setChallanDate(e.target.value)} required />
                        </div>

                        {/* PO Link — approved POs for selected vendor only */}
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Link to PO (Approved)</Label>
                            <Popover
                                open={openPoCombo}
                                onOpenChange={v => { if (selectedVendor) { setOpenPoCombo(v); if (!v) setPoSearch(''); } }}
                            >
                                <PopoverTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        disabled={!selectedVendor}
                                        className="w-full justify-between font-normal"
                                    >
                                        {selectedPo ? (
                                            <span className="truncate">
                                                <span className="font-semibold">{selectedPo.poNumber}</span>
                                                {selectedPo.items?.length > 0 && (
                                                    <span className="text-muted-foreground ml-1">
                                                        · {selectedPo.items.map((i: any) => `${i.partNumber}${i.partDescription ? ' – ' + i.partDescription : ''}`).join(', ')}
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                {selectedVendor ? 'Select approved PO (optional)...' : 'Select vendor first'}
                                            </span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command shouldFilter={false}>
                                        <CommandInput
                                            placeholder="Search by PO number or part..."
                                            value={poSearch}
                                            onValueChange={setPoSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                {pos.length === 0
                                                    ? 'No approved POs found for this vendor.'
                                                    : 'No POs match your search.'}
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {/* Clear option */}
                                                {selectedPo && (
                                                    <CommandItem
                                                        value="__clear__"
                                                        onSelect={() => { handlePoSelect(''); setPoSearch(''); setOpenPoCombo(false); }}
                                                        className="cursor-pointer text-muted-foreground italic"
                                                    >
                                                        ✕ Remove PO link
                                                    </CommandItem>
                                                )}
                                                {pos
                                                    .filter(p => {
                                                        if (!poSearch) return true;
                                                        const q = poSearch.toLowerCase();
                                                        const partMatch = p.items?.some((i: any) =>
                                                            i.partNumber?.toLowerCase().includes(q) ||
                                                            i.partDescription?.toLowerCase().includes(q)
                                                        );
                                                        return p.poNumber?.toLowerCase().includes(q) || partMatch;
                                                    })
                                                    .map(p => {
                                                        const partSummary = p.items?.length
                                                            ? p.items.map((i: any) =>
                                                                `${i.partNumber}${i.partDescription ? ' – ' + i.partDescription : ''}`
                                                              ).join(', ')
                                                            : null;
                                                        return (
                                                            <CommandItem
                                                                key={p.id}
                                                                value={p.id}
                                                                onSelect={() => {
                                                                    handlePoSelect(p.id);
                                                                    setPoSearch('');
                                                                    setOpenPoCombo(false);
                                                                }}
                                                                className="cursor-pointer flex-col items-start py-2.5"
                                                            >
                                                                <div className="flex items-center w-full gap-2">
                                                                    <Check className={cn('h-4 w-4 shrink-0', selectedPo?.id === p.id ? 'opacity-100' : 'opacity-0')} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-sm">{p.poNumber}</span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {format(new Date(p.poDate), 'dd MMM yyyy')}
                                                                            </span>
                                                                            <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                                                                                Approved
                                                                            </span>
                                                                        </div>
                                                                        {partSummary && (
                                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                                                {partSummary}
                                                                            </p>
                                                                        )}
                                                                        {!partSummary && (
                                                                            <p className="text-xs text-muted-foreground/60 mt-0.5 italic">No parts listed</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {selectedVendor && pos.length === 0 && (
                                <p className="text-xs text-amber-600">No approved POs found for this vendor.</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label>Place of Supply</Label>
                            <Input placeholder="e.g. Maharashtra" defaultValue={orgDetails?.state || ''} />
                        </div>

                        <div className="col-span-2 md:col-span-3 space-y-1.5">
                            <Label>Remarks</Label>
                            <Textarea rows={2} placeholder="Any special instructions or notes..." value={remarks} onChange={e => setRemarks(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Package className="h-4 w-4" /> Material Items
                        </CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={() => setItems(prev => [...prev, emptyItem()])}>
                            <Plus className="h-4 w-4 mr-1" /> Add Row
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground text-xs uppercase">
                                        <th className="text-left pb-2 pr-2 w-[180px]">Part No.</th>
                                        <th className="text-left pb-2 pr-2">Description</th>
                                        <th className="text-left pb-2 pr-2 w-[80px]">HSN</th>
                                        <th className="text-right pb-2 pr-2 w-[80px]">Qty</th>
                                        <th className="text-left pb-2 pr-2 w-[70px]">UOM</th>
                                        <th className="text-right pb-2 pr-2 w-[90px]">Rate (₹)</th>
                                        <th className="text-right pb-2 pr-2 w-[90px]">Amount (₹)</th>
                                        <th className="w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {items.map(item => (
                                        <tr key={item.id} className="group">
                                            <td className="py-2 pr-2">
                                                <Popover
                                                    open={openPartCombo[item.id]}
                                                    onOpenChange={v => {
                                                        setOpenPartCombo(p => ({ ...p, [item.id]: v }));
                                                        if (!v) setPartSearch(p => ({ ...p, [item.id]: '' }));
                                                    }}
                                                >
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="sm" className="w-full justify-between h-8 font-normal text-xs">
                                                            {item.partNumber || <span className="text-muted-foreground">Search...</span>}
                                                            <ChevronsUpDown className="h-3 w-3 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[280px] p-0" align="start">
                                                        <Command shouldFilter={false}>
                                                            <CommandInput
                                                                placeholder="Type part no or name..."
                                                                value={partSearch[item.id] || ''}
                                                                onValueChange={v => setPartSearch(p => ({ ...p, [item.id]: v }))}
                                                            />
                                                            <CommandList>
                                                                <CommandEmpty>No parts found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {availableParts
                                                                        .filter(p => {
                                                                            const q = (partSearch[item.id] || '').toLowerCase();
                                                                            return !q || p.partNumber?.toLowerCase().includes(q) || p.partName?.toLowerCase().includes(q);
                                                                        })
                                                                        .map(p => (
                                                                            <CommandItem key={p.id} value={p.id} onSelect={() => handlePartSelect(item.id, p)} className="cursor-pointer">
                                                                                <div>
                                                                                    <p className="font-bold text-xs">{p.partNumber}</p>
                                                                                    <p className="text-xs text-muted-foreground">{p.partName || p.description}</p>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </td>
                                            <td className="py-2 pr-2">
                                                <Input value={item.partDescription} onChange={e => updateItem(item.id, 'partDescription', e.target.value)} className="h-8 text-xs" placeholder="Description" />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <Input value={item.hsnCode} onChange={e => updateItem(item.id, 'hsnCode', e.target.value)} className="h-8 text-xs" placeholder="HSN" />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <Input type="number" min="1" value={item.quantityIssued} onChange={e => updateItem(item.id, 'quantityIssued', parseInt(e.target.value) || 1)} className="h-8 text-xs text-right" />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <Input value={item.unitOfMeasure} onChange={e => updateItem(item.id, 'unitOfMeasure', e.target.value)} className="h-8 text-xs" />
                                            </td>
                                            <td className="py-2 pr-2">
                                                <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-xs text-right" />
                                            </td>
                                            <td className="py-2 pr-2 text-right text-xs font-semibold">
                                                ₹{(item.quantityIssued * item.unitPrice).toLocaleString()}
                                            </td>
                                            <td className="py-2">
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => items.length > 1 && setItems(items.filter(i => i.id !== item.id))} disabled={items.length === 1}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t font-semibold">
                                        <td colSpan={3} className="pt-3 text-xs text-muted-foreground">{items.length} item(s)</td>
                                        <td className="pt-3 text-right text-sm">{totals.qty}</td>
                                        <td colSpan={2} className="pt-3 text-right text-xs text-muted-foreground">Total Amount</td>
                                        <td className="pt-3 text-right text-sm text-indigo-600">₹{totals.amount.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Transport Details */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                            <Truck className="h-4 w-4" /> Transport Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label>Mode of Transport</Label>
                            <Select value={transportMode} onValueChange={setTransportMode}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Road">Road</SelectItem>
                                    <SelectItem value="Rail">Rail</SelectItem>
                                    <SelectItem value="Air">Air</SelectItem>
                                    <SelectItem value="Ship">Ship</SelectItem>
                                    <SelectItem value="Hand Delivery">Hand Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Vehicle Number</Label>
                            <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value.toUpperCase())} placeholder="MH12AB1234" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Transporter Name</Label>
                            <Input value={transporterName} onChange={e => setTransporterName(e.target.value)} placeholder="VRL Logistics" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Driver Name</Label>
                            <Input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Ramesh Kumar" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Driver Phone</Label>
                            <Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} placeholder="+91-9876543210" type="tel" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>E-Way Bill No.</Label>
                            <Input value={ewayBillNumber} onChange={e => setEwayBillNumber(e.target.value)} placeholder="121234567890" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>E-Way Bill Date</Label>
                            <Input type="date" value={ewayBillDate} onChange={e => setEwayBillDate(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.push('/dashboard/challans')}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 min-w-[160px]" disabled={submitting}>
                        {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 'Save & Generate Challan'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
