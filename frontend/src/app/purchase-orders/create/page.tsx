"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { purchaseOrderService } from "@/services/purchase-order-service";
import { rateCardService } from "@/services/rate-card-service"; // Import rate card service
import { apiClient } from "@/lib/api-client";
import { CreatePurchaseOrderDto, CreatePOItemDto, JobWorkType } from "@/types/purchase-order";
import { VendorRateCard } from "@/types/rate-card"; // Import Rate Card Type
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Calculator, Check, ChevronsUpDown, Search, X } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export default function CreatePOPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);

    // Rate Cards State
    const [vendorRateCards, setVendorRateCards] = useState<VendorRateCard[]>([]);
    const [loadingRates, setLoadingRates] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<CreatePurchaseOrderDto>>({
        poDate: format(new Date(), 'yyyy-MM-dd'),
        jobWorkType: JobWorkType.with_material,
        items: []
    });

    const [items, setItems] = useState<Partial<CreatePOItemDto>[]>([
        { quantity: 1, ratePerPiece: 0, operations: [] }
    ]);

    const [availableParts, setAvailableParts] = useState<any[]>([]);
    const [partOperationsMap, setPartOperationsMap] = useState<Record<string, any[]>>({});
    const [itemPartIds, setItemPartIds] = useState<Record<number, string>>({});
    const [taxRate, setTaxRate] = useState<number>(0);
    const [openVendorCombo, setOpenVendorCombo] = useState(false);
    const [openPartComboIds, setOpenPartComboIds] = useState<Record<number, boolean>>({});
    const [openOpComboIds, setOpenOpComboIds] = useState<Record<number, boolean>>({});

    useEffect(() => {
        loadVendors();
        fetchParts();
    }, []);

    const fetchParts = async () => {
        try {
            const response = await apiClient.get('/parts');
            setAvailableParts(response.data.data || response.data || []);
        } catch (error) {
            console.error("Failed to fetch parts", error);
        }
    };

    const fetchPartOperations = async (partId: string) => {
        if (partOperationsMap[partId]) return; // already cached
        try {
            const res = await apiClient.get(`/parts/${partId}/operations`);
            const ops = res.data || [];
            setPartOperationsMap(prev => ({ ...prev, [partId]: ops }));
        } catch (e) {
            console.error('Failed to fetch part operations', e);
        }
    };

    const handlePartSelect = async (index: number, part: any) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            partNumber: part.partNumber,
            partDescription: part.partName || part.description || '',
        };
        setItems(newItems);
        setItemPartIds(prev => ({ ...prev, [index]: part.id }));
        setOpenPartComboIds(prev => ({ ...prev, [index]: false }));
        await fetchPartOperations(part.id);
    };

    // Fetch Rate Cards when Vendor Changes
    useEffect(() => {
        if (formData.vendorId) {
            loadRateCards(formData.vendorId);
        } else {
            setVendorRateCards([]);
        }
    }, [formData.vendorId]);

    const loadVendors = async () => {
        try {
            const res = await apiClient.get('/vendors');
            setVendors(res.data.data || res.data || []);
        } catch (error) {
            console.error("Failed to load vendors");
        }
    };

    const loadRateCards = async (vendorId: string) => {
        setLoadingRates(true);
        try {
            const data = await rateCardService.getAll(vendorId);
            setVendorRateCards(data.filter(rc => rc.isActive)); // Only active cards
        } catch (error) {
            console.error("Failed to load rate cards:", error);
        } finally {
            setLoadingRates(false);
        }
    };

    const handleItemChange = (index: number, field: keyof CreatePOItemDto, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-fill description if a known part is matched while typing
        if (field === 'partNumber') {
            const partInfo = availableParts.find(p => p.partNumber === value);
            if (partInfo) {
                newItems[index].partDescription = partInfo.partName || partInfo.description || '';
            }
        }

        setItems(newItems);
    };

    // Special handler for Operation selection to auto-fill rate
    const handleOperationToggle = (index: number, operationStr: string) => {
        const newItems = [...items];
        const currentOps = newItems[index].operations || [];

        let newOps = [...currentOps];
        if (newOps.includes(operationStr)) {
            newOps = newOps.filter(o => o !== operationStr);
        } else {
            newOps.push(operationStr);
        }

        // Auto-calculate sum of rates if rate cards exist for these selected operations
        let defaultRate = 0;
        newOps.forEach(op => {
            const rc = vendorRateCards.find(card => card.operationType === op);
            if (rc) defaultRate += rc.baseRate;
        });

        newItems[index] = {
            ...newItems[index],
            operations: newOps,
            ratePerPiece: defaultRate || newItems[index].ratePerPiece // keep user typed rate if no default found
        };
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { quantity: 1, ratePerPiece: 0, operations: [] }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        let subtotal = 0;
        items.forEach(item => {
            const qty = item.quantity || 0;
            const rate = item.ratePerPiece || 0;
            subtotal += qty * rate;
        });
        const tax = subtotal * ((taxRate || 0) / 100);
        return { subtotal, tax, total: subtotal + tax };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendorId) {
            toast.error("Please select a vendor");
            return;
        }

        // Basic Validation
        const validItems = items.every(i => i.partNumber && i.quantity && i.ratePerPiece);
        if (!validItems) {
            toast.error("Please fill in all required item fields (Part Number, Quantity, Rate)");
            return;
        }

        setSubmitting(true);
        try {
            const payload: CreatePurchaseOrderDto = {
                ...formData as any,
                poDate: new Date(formData.poDate!).toISOString(),
                deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
                items: items as CreatePOItemDto[]
            };

            await purchaseOrderService.create(payload);
            toast.success('Purchase Order created successfully');
            router.push('/purchase-orders');
        } catch (error: any) {
            console.error("Failed to create PO", error);
            toast.error(error.response?.data?.message || "Failed to create Purchase Order");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/purchase-orders">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Create Purchase Order</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Header Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 relative">
                            <Label>Vendor *</Label>
                            {/* Vendor Combo */}
                            <Popover open={openVendorCombo} onOpenChange={setOpenVendorCombo}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openVendorCombo}
                                        className="w-full justify-between"
                                    >
                                        {formData.vendorId
                                            ? vendors.find((v) => v.id === formData.vendorId)?.companyName
                                            : "Search Vendor..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search vendor..." />
                                        <CommandList>
                                            <CommandEmpty>No vendor found.</CommandEmpty>
                                            <CommandGroup>
                                                {vendors.map((v) => (
                                                    <CommandItem
                                                        key={v.id}
                                                        value={v.companyName}
                                                        onSelect={() => {
                                                            setFormData({ ...formData, vendorId: v.id });
                                                            setOpenVendorCombo(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.vendorId === v.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
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
                            <Label htmlFor="poDate">PO Date *</Label>
                            <Input
                                id="poDate"
                                type="date"
                                value={formData.poDate}
                                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Job Type</Label>
                            <Select
                                value={formData.jobWorkType}
                                onValueChange={(v: any) => setFormData({ ...formData, jobWorkType: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={JobWorkType.with_material}>With Material</SelectItem>
                                    <SelectItem value={JobWorkType.maesof}>Services Only (MAESOF)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Delivery Date</Label>
                            <Input
                                type="date"
                                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Delivery Address</Label>
                            <Input
                                placeholder="Warehouse Location..."
                                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Items */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Line Items</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addItem}>
                            <Plus className="h-4 w-4 mr-2" /> Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-4 last:border-0 last:pb-0">
                                <div className="col-span-3 space-y-2 relative">
                                    <Label className="text-xs">Part Number *</Label>
                                    <Popover open={openPartComboIds[index]} onOpenChange={(val) => setOpenPartComboIds(prev => ({ ...prev, [index]: val }))}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between h-10 px-3 bg-transparent border-slate-200 focus:ring-1 focus:ring-indigo-500 font-medium text-left truncate"
                                            >
                                                {item.partNumber || <span className="text-slate-500 font-normal">Search Part No...</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command filter={(value, search) => {
                                                if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                                                return 0;
                                            }}>
                                                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                                                    <input
                                                        placeholder="Type part number or name..."
                                                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"
                                                        value={item.partNumber}
                                                        onChange={(e) => handleItemChange(index, 'partNumber', e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                                <CommandList>
                                                    <CommandEmpty>No matching parts found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {availableParts
                                                            .filter(p =>
                                                                !item.partNumber ||
                                                                p.partNumber?.toLowerCase().includes((item.partNumber || '').toLowerCase()) ||
                                                                p.partName?.toLowerCase().includes((item.partNumber || '').toLowerCase())
                                                            )
                                                            .map((p) => (
                                                            <CommandItem
                                                                key={p.id}
                                                                value={`${p.partNumber} ${p.partName || ''} ${p.description || ''}`}
                                                                onSelect={() => handlePartSelect(index, p)}
                                                                className="cursor-pointer"
                                                            >
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
                                <div className="col-span-3 space-y-2">
                                    <Label className="text-xs">Description</Label>
                                    <Input
                                        value={item.partDescription || ''}
                                        onChange={(e) => handleItemChange(index, 'partDescription', e.target.value)}
                                        placeholder="Optional description"
                                    />
                                </div>
                                {/* Operation Selector */}
                                <div className="col-span-2 space-y-2 relative">
                                    <Label className="text-xs flex justify-between items-center">
                                        <span>Operations</span>
                                    </Label>
                                    <Popover open={openOpComboIds[index]} onOpenChange={(val) => setOpenOpComboIds(prev => ({ ...prev, [index]: val }))}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className="w-full justify-between h-10 px-3 bg-transparent font-normal overflow-hidden"
                                                disabled={!formData.vendorId}
                                            >
                                                <div className="truncate text-left w-full flex gap-1 items-center">
                                                    {!item.operations || item.operations.length === 0 ? (
                                                        <span className="text-slate-500">Select stages...</span>
                                                    ) : (
                                                        item.operations.map((op, i) => (
                                                            <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 truncate max-w-[60px]">{op}</Badge>
                                                        ))
                                                    )}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[280px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search operation..." />
                                                <CommandList>
                                                    <CommandEmpty>No stages found.</CommandEmpty>
                                                    <CommandGroup heading="Job Cycle Operations">
                                                        {(() => {
                                                            const partId = itemPartIds[index];
                                                            const ops = (partId && partOperationsMap[partId]) || [];
                                                            if (ops.length === 0) return <div className="text-xs text-slate-500 p-2 text-center">Select a part first to see its job cycle operations.</div>;
                                                            return ops.map((op: any) => {
                                                                const label = op.operationName;
                                                                const isSelected = (item.operations || []).includes(label);
                                                                const rc = vendorRateCards.find(r => r.operationType === label);
                                                                return (
                                                                    <CommandItem
                                                                        key={op.id}
                                                                        value={label}
                                                                        onSelect={() => handleOperationToggle(index, label)}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0 text-transparent")} />
                                                                        <div className="flex justify-between w-full items-center">
                                                                            <span>{label}</span>
                                                                            {rc && <span className="text-xs text-indigo-600 bg-indigo-50 px-1 rounded">₹{rc.baseRate}</span>}
                                                                        </div>
                                                                    </CommandItem>
                                                                );
                                                            });
                                                        })()}
                                                    </CommandGroup>
                                                    <CommandGroup heading="Vendor Rate Cards (Fallback)">
                                                        {vendorRateCards.length === 0 && <div className="text-xs text-slate-500 p-2 text-center">No active rate cards.</div>}
                                                        {vendorRateCards.map(rc => {
                                                            const partId = itemPartIds[index];
                                                            const ops = (partId && partOperationsMap[partId]) || [];
                                                            // Don't duplicate if it's already in job cycle operations
                                                            if (ops.some((op: any) => op.operationName === rc.operationType)) return null;

                                                            const isSelected = (item.operations || []).includes(rc.operationType);
                                                            return (
                                                                <CommandItem
                                                                    key={rc.operationType}
                                                                    value={rc.operationType}
                                                                    onSelect={() => handleOperationToggle(index, rc.operationType)}
                                                                    className="cursor-pointer text-slate-600"
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100 text-slate-900" : "opacity-0 text-transparent")} />
                                                                    <div className="flex justify-between w-full items-center text-sm">
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
                                <div className="col-span-1 space-y-2">
                                    <Label className="text-xs">Qty *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs">Rate (₹) *</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={item.ratePerPiece}
                                        onChange={(e) => handleItemChange(index, 'ratePerPiece', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 3. Footer & Totals (Unchanged logic, just re-rendering) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Terms & Remarks</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Payment Terms</Label>
                                    <Input
                                        placeholder="e.g. 30 Days Net"
                                        value={formData.paymentTerms || ''}
                                        onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Remarks</Label>
                                    <Textarea
                                        placeholder="Any special instructions..."
                                        value={formData.remarks || ''}
                                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
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
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" /> Create Order
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    );
}
