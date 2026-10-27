"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { stockStatementService } from "@/services/stock-statement-service";
import { apiClient } from "@/lib/api-client";
import { CreateStockStatementDto } from "@/types/stock-statement";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import toast from 'react-hot-toast';

export default function CreateStockStatementPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [vendors, setVendors] = useState<any[]>([]);

    // Default to last month
    const lastMonth = subMonths(new Date(), 1);

    const [formData, setFormData] = useState<CreateStockStatementDto>({
        vendorId: "",
        periodFrom: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        periodTo: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        remarks: ""
    });

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        try {
            const res = await apiClient.get('/vendors?status=approved');
            // Handle different response structures if necessary, similar to PO page
            setVendors(res.data.data || res.data || []);
        } catch (error) {
            console.error("Failed to load vendors");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vendorId) {
            toast.error("Please select a vendor");
            return;
        }

        setSubmitting(true);
        try {
            // Ensure dates are full ISO strings if backend expects them (though backend logic seemed to parse string dates)
            // But let's pass generic YYYY-MM-DD which IsDateString validator usually accepts, 
            // OR full ISO. Backend DTO uses @IsDateString().
            // Let's pass simple strings as they are from input type="date".
            // Actually StockStatementsService does `new Date(periodFrom)`.

            await stockStatementService.create(formData);
            router.push('/stock-statements');
        } catch (error: any) {
            console.error("Failed to generate statement", error);
            toast.error(error.response?.data?.message || "Failed to generate Stock Statement");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/stock-statements">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Generate Stock Statement</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Statement Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Vendor Selection */}
                        <div className="space-y-2">
                            <Label>Vendor *</Label>
                            <Select
                                value={formData.vendorId}
                                onValueChange={(v) => setFormData({ ...formData, vendorId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vendors.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.companyName} ({v.vendorCode})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Select the vendor to reconcile stock for.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Period From *</Label>
                                <Input
                                    type="date"
                                    value={formData.periodFrom}
                                    onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Period To *</Label>
                                <Input
                                    type="date"
                                    value={formData.periodTo}
                                    onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Remarks</Label>
                            <Textarea
                                placeholder="Any additional notes..."
                                value={formData.remarks || ''}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>

                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" /> Generate Statement
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
