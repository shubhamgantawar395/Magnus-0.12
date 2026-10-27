"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { purchaseOrderService } from "@/services/purchase-order-service";
import { rateCardService } from "@/services/rate-card-service";
import { apiClient } from "@/lib/api-client";
import { CreatePurchaseOrderDto, CreatePOItemDto, JobWorkType, POStatus } from "@/types/purchase-order";
import { VendorRateCard } from "@/types/rate-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Calculator, Check, ChevronsUpDown, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export default function EditPOPage() {
    const router = useRouter();
    const params = useParams();
    const poId = params.id as string;

    const [pageLoading, setPageLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);
    const [vendorRateCards, setVendorRateCards] = useState<VendorRateCard[]>([]);
    const [availableParts, setAvailableParts] = useState<any[]>([]);
    const [partOperationsMap, setPartOperationsMap] = useState<Record<string, any[]>>({});
    const [itemPartIds, setItemPartIds] = useState<Record<number, string>>({});
    const [taxRate, setTaxRate] = useState<number>(0);
    const [openVendorCombo, setOpenVendorCombo] = useState(false);
    const [openPartComboIds, setOpenPartComboIds] = useState<Record<number, boolean>>({});
    const [openOpComboIds, setOpenOpComboIds] = useState<Record<number, boolean>>({});

    const [formData, setFormData] = useState<Partial<CreatePurchaseOrderDto>>({
        poDate: format(new Date(), 'yyyy-MM-dd'),
        jobWorkType: JobWorkType.with_material,
        items: []
    });
    const [items, setItems] = useState<Partial<CreatePOItemDto>[]>([
        { quantity: 1, ratePerPiece: 0, operations: [] }
    ]);

    useEffect(() => {
        Promise.all([loadVendors(), fetchParts(), loadExistingPO()]).finally(() => setPageLoading(false));
    }, []);

    useEffect(() => {
        if (formData.vendorId) loadRateCards(formData.vendorId);
        else setVendorRateCards([]);
    }, [formData.vendorId]);

    const loadExistingPO = async () => {
        try {
            const po = await purchaseOrderService.getById(poId);
            if (po.status !== POStatus.draft) {
                toast.error("Only Draft POs can be edited");
                router.push(`/purchase-orders/${poId}`);
                return;
            }
            setFormData({
                vendorId: po.vendor?.id || po.vendorId,
                poDate: format(new Date(po.poDate), 'yyyy-MM-dd'),
                jobWorkType: po.jobWorkType,
                deliveryDate: po.deliveryDate ? format(new Date(po.deliveryDate), 'yyyy-MM-dd') : undefined,
                deliveryAddress: po.deliveryAddress || '',
                paymentTerms: po.paymentTerms || '',
                remarks: po.remarks || '',
            });
            setItems(po.items.map((item: any) => ({
                partNumber: item.partNumber,
                partDescription: item.partDescription || '',
                quantity: item.quantity,
                ratePerPiece: item.ratePerPiece,
                operations: item.operations || [],
            })));
        } catch (err) {
            toast.error("Failed to load PO");
            router.push('/purchase-orders');
        }
    };

    const loadVendors = async () => {
        try {
            const res = await apiClient.get('/vendors');
            setVendors(res.data.data || res.data || []);
        } catch { }
    };

    const fetchParts = async () => {
        try {
            const res = await apiClient.get('/parts');
            setAvailableParts(res.data.data || res.data || []);
        } catch { }
    };

    const loadRateCards = async (vendorId: string) => {
        try {
            const data = await rateCardService.getAll(vendorId);
            setVendorRateCards(data.filter(rc => rc.isActive));
        } catch { }
    };

    const fetchPartOperations = async (partId: string) => {
        if (partOperationsMap[partId]) return;
        try {
            const res = await apiClient.get(`/parts/${partId}/operations`);
            setPartOperationsMap(prev => ({ ...prev, [partId]: res.data || [] }));
        } catch { }
    };

    const handlePartSelect = async (index: number, part: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], partNumber: part.partNumber, partDescription: part.partName || part.description || '' };
        setItems(newItems);
        setItemPartIds(prev => ({ ...prev, [index]: part.id }));
        setOpenPartComboIds(prev => ({ ...prev, [index]: false }));
        await fetchPartOperations(part.id);
    };

    const handleItemChange = (index: number, field: keyof CreatePOItemDto, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'partNumber') {
            const p = availableParts.find(p => p.partNumber === value);
            if (p) newItems[index].partDescription = p.partName || p.description || '';
        }
        setItems(newItems);
    };

    const handleOperationToggle = (index: number, op: string) => {
        const newItems = [...items];
        const ops = newItems[index].operations || [];
        newItems[index].operations = ops.includes(op) ? ops.filter(o => o !== op) : [...ops, op];
        let rate = 0;
        newItems[index].operations!.forEach(o => {
            const rc = vendorRateCards.find(r => r.operationType === o);
            if (rc) rate += rc.baseRate;
        });
        if (rate > 0) newItems[index].ratePerPiece = rate;
        setItems(newItems);
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.ratePerPiece || 0)), 0);
        const tax = subtotal * ((taxRate || 0) / 100);
        return { subtotal, tax, total: subtotal + tax };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendorId) { toast.error("Please select a vendor"); return; }
        if (!items.every(i => i.partNumber && i.quantity && i.ratePerPiece)) {
            toast.error("Fill in all required item fields"); return;
        }
        setSubmitting(true);
        try {
            await purchaseOrderService.update(poId, {
                ...formData as any,
                poDate: new Date(formData.poDate!).toISOString(),
                deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
                items: items as CreatePOItemDto[]
            });
            toast.success("Purchase Order updated");
            router.push(`/purchase-orders/${poId}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to update PO");
        } finally {
            setSubmitting(false);
        }
    };

    const totals = calculateTotals();

    if (pageLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/purchase-orders/${poId}`}>
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Edit Purchase Order</h1>
                    <p className="text-sm text-muted-foreground">Only Draft POs can be edited</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Header */}
                <Card>
                    <CardHeader><CardTitle className="text-lg">Order Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Vendor *</Label>
                            <Popover open={openVendorCombo} onOpenChange={setOpenVendorCombo}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" className="w-full justify-between">
                                        {formData.vendorId ? vendors.find(v => v.id === formData.vendorId)?.companyName : "Select Vendor..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search vendor..." />
                                        <CommandList>
                                            <CommandEmpty>No vendor found.</CommandEmpty>
                                            <CommandGroup>
                                                {vendors.map(v => (
                                                    <CommandItem key={v.id} value={v.companyName} onSelect={() => { setFormData({ ...formData, vendorId: v.id }); setOpenVendorCombo(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", formData.vendorId === v.id ? "opacity-100" : "opacity-0")} />
                                                        {v.companyName}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>PO Date *</Label>
                            <Input type="date" value={formData.poDate} onChange={e => setFormData({ ...formData, poDate: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Job Type</Label>
                            <Select value={formData.jobWorkType} onValueChange={(v: any) => setFormData({ ...formData, jobWorkType: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={JobWorkType.with_material}>With Material</SelectItem>
                                    <SelectItem value={JobWorkType.maesof}>Services Only (MAESOF)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Delivery Date</Label>
                            <Input type="date" value={formData.deliveryDate || ''} onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Delivery Address</Label>
                            <Input value={formData.deliveryAddress || ''} placeholder="Warehouse Location..." onChange={e => setFormData({ ...formData, deliveryAddress: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Line Items</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { quantity: 1, ratePerPiece: 0, operations: [] }])}>
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-4 last:border-0">
                                {/* Part Number */}
                                <div className="col-span-3 space-y-2">
                                    <Label className="text-xs">Part Number *</Label>
                                    <Popover open={openPartComboIds[index]} onOpenChange={val => setOpenPartComboIds(p => ({ ...p, [index]: val }))}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" className="w-full justify-between h-10 px-3 font-medium text-left truncate">
                                                {item.partNumber || <span className="text-slate-500 font-normal">Search Part No...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <div className="flex items-center border-b px-3">
                                                    <Search className="mr-2 h-4 w-4 opacity-50" />
                                                    <input
                                                        placeholder="Type part number or name..."
                                                        className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"
                                                        value={item.partNumber}
                                                        onChange={e => handleItemChange(index, 'partNumber', e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <CommandList>
                                                    <CommandEmpty>No matching parts.</CommandEmpty>
                                                    <CommandGroup>
                                                        {availableParts
                                                            .filter(p => !item.partNumber || p.partNumber?.toLowerCase().includes((item.partNumber || '').toLowerCase()) || p.partName?.toLowerCase().includes((item.partNumber || '').toLowerCase()))
                                                            .map(p => (
                                                                <CommandItem key={p.id} value={`${p.partNumber} ${p.partName || ''}`} onSelect={() => handlePartSelect(index, p)} className="cursor-pointer">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold">{p.partNumber}</span>
                                                                        <span className="text-xs text-slate-500">{p.partName || p.description || '—'}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {/* Description */}
                                <div className="col-span-3 space-y-2">
                                    <Label className="text-xs">Description</Label>
                                    <Input value={item.partDescription || ''} onChange={e => handleItemChange(index, 'partDescription', e.target.value)} placeholder="Part description" />
                                </div>
                                {/* Operations */}
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs">Operations</Label>
                                    <Popover open={openOpComboIds[index]} onOpenChange={val => setOpenOpComboIds(p => ({ ...p, [index]: val }))}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" className="w-full justify-between h-10 px-3 font-normal overflow-hidden" disabled={!formData.vendorId}>
                                                <div className="truncate text-left w-full flex gap-1">
                                                    {!item.operations?.length ? <span className="text-slate-500">Select...</span> :
                                                        item.operations.map((op, i) => <Badge key={i} variant="secondary" className="text-[10px] px-1 max-w-[60px] truncate">{op}</Badge>)}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search operation..." />
                                                <CommandList>
                                                    <CommandEmpty>No stages found.</CommandEmpty>
                                                    <CommandGroup heading="Job Cycle Operations">
                                                        {(() => {
                                                            const ops = (itemPartIds[index] && partOperationsMap[itemPartIds[index]]) || [];
                                                            if (!ops.length) return <div className="text-xs text-slate-500 p-2 text-center">Select a part first.</div>;
                                                            return ops.map((op: any) => {
                                                                const isSelected = (item.operations || []).includes(op.operationName);
                                                                const rc = vendorRateCards.find(r => r.operationType === op.operationName);
                                                                return (
                                                                    <CommandItem key={op.id} value={op.operationName} onSelect={() => handleOperationToggle(index, op.operationName)} className="cursor-pointer">
                                                                        <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                                                        <div className="flex justify-between w-full">
                                                                            <span>{op.operationName}</span>
                                                                            {rc && <span className="text-xs text-indigo-600 bg-indigo-50 px-1 rounded">₹{rc.baseRate}</span>}
                                                                        </div>
                                                                    </CommandItem>
                                                                );
                                                            });
                                                        })()}
                                                    </CommandGroup>
                                                    <CommandGroup heading="Vendor Rate Cards">
                                                        {vendorRateCards.filter(rc => {
                                                            const ops = (itemPartIds[index] && partOperationsMap[itemPartIds[index]]) || [];
                                                            return !ops.some((op: any) => op.operationName === rc.operationType);
                                                        }).map(rc => {
                                                            const isSelected = (item.operations || []).includes(rc.operationType);
                                                            return (
                                                                <CommandItem key={rc.operationType} value={rc.operationType} onSelect={() => handleOperationToggle(index, rc.operationType)} className="cursor-pointer text-slate-600">
                                                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex justify-between w-full">
                                                                        <span>{rc.operationType}</span>
                                                                        <span className="text-xs text-indigo-600 bg-indigo-50 px-1 rounded">₹{rc.baseRate}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {/* Qty */}
                                <div className="col-span-1 space-y-2">
                                    <Label className="text-xs">Qty *</Label>
                                    <Input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} />
                                </div>
                                {/* Rate */}
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs">Rate (₹) *</Label>
                                    <Input type="number" min="0" value={item.ratePerPiece} onChange={e => handleItemChange(index, 'ratePerPiece', parseFloat(e.target.value))} />
                                </div>
                                {/* Remove */}
                                <div className="col-span-1 flex justify-end">
                                    <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== index))} disabled={items.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Terms & Remarks</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Payment Terms</Label>
                                    <Input placeholder="e.g. 30 Days Net" value={formData.paymentTerms || ''} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Remarks</Label>
                                    <Textarea placeholder="Any special instructions..." value={formData.remarks || ''} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div>
                        <Card className="bg-slate-50 border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calculator className="h-5 w-5" /> Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₹{totals.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm gap-2">
                                    <Label className="text-muted-foreground whitespace-nowrap">Tax Rate (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                        className="w-24 h-7 text-right text-sm"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tax ({taxRate || 0}%)</span>
                                    <span>₹{totals.tax.toLocaleString()}</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-indigo-600">₹{totals.total.toLocaleString()}</span>
                                </div>
                                <Button className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 font-semibold" disabled={submitting}>
                                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
