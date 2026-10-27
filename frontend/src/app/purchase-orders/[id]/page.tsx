"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { purchaseOrderService } from "@/services/purchase-order-service";
import { PurchaseOrder, POStatus } from "@/types/purchase-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, Printer, Pencil, Trash2, Building2, Calendar, FileText, MapPin, CheckCircle, AlertCircle, Download } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';

export default function PurchaseOrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadPo(params.id as string);
        }
    }, [params.id]);

    const loadPo = async (id: string) => {
        try {
            setLoading(true);
            const data = await purchaseOrderService.getById(id);
            setPo(data);
        } catch (error) {
            console.error("Failed to load PO", error);
        } finally {
            setLoading(false);
        }
    };

    const [processing, setProcessing] = useState(false);

    const handleSubmit = async () => {
        if (!confirm("Submit this PO for approval? You won't be able to edit it afterwards.")) return;
        setProcessing(true);
        try {
            await purchaseOrderService.submit(po!.id);
            loadPo(po!.id);
        } catch (error) {
            console.error("Failed to submit PO", error);
            toast.error("Failed to submit PO");
        } finally {
            setProcessing(false);
        }
    };

    const handleApprove = async () => {
        const remarks = prompt("Optional: Add approval remarks");
        if (remarks === null) return; // Cancelled
        setProcessing(true);
        try {
            await purchaseOrderService.approve(po!.id, remarks);
            loadPo(po!.id);
        } catch (error: any) {
            console.error("Failed to approve PO", error);
            toast.error(error.response?.data?.message || "Failed to approve PO. Ensure you have the correct role.");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt("Required: Enter rejection reason");
        if (!reason) return;
        setProcessing(true);
        try {
            await purchaseOrderService.reject(po!.id, reason);
            loadPo(po!.id);
        } catch (error: any) {
            console.error("Failed to reject PO", error);
            toast.error(error.response?.data?.message || "Failed to reject PO. Ensure you have the correct role.");
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!po || !confirm("Are you sure you want to delete this Purchase Order? This action cannot be undone.")) return;

        setDeleting(true);
        try {
            await purchaseOrderService.delete(po.id);
            router.push('/purchase-orders');
        } catch (error) {
            console.error("Failed to delete PO", error);
            toast.error("Failed to delete Purchase Order. It may not be in Draft status.");
        } finally {
            setDeleting(false);
        }
    };

    const { token } = useAuthStore();

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!po) return;
        try {
            const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${API}/purchase-orders/${po.id}/pdf`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to generate PDF');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `PO-${po.poNumber?.replace(/\//g, '-') || po.id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Failed to download PDF');
        }
    };

    const getStatusColor = (status: POStatus) => {
        switch (status) {
            case POStatus.approved: return "bg-green-100 text-green-800 border-green-200";
            case POStatus.pending_approval: return "bg-orange-100 text-orange-800 border-orange-200";
            case POStatus.rejected: return "bg-red-100 text-red-800 border-red-200";
            case POStatus.draft: return "bg-slate-100 text-slate-800 border-slate-200";
            default: return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!po) return null;

    return (
        <div className="container mx-auto py-10 max-w-5xl print:p-0 print:max-w-none">
            {/* Print Header - Visible only when printing */}
            <div className="hidden print:block mb-8 border-b pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">PURCHASE ORDER</h1>
                        <p className="text-sm text-gray-500">Aaniry VMS</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">{po.poNumber}</h2>
                        <p className="text-sm">Date: {format(new Date(po.poDate), 'dd MMM yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Header / Nav */}
            <div className="flex justify-between items-start mb-8 no-print">
                <div className="flex items-center gap-4">
                    <Link href="/purchase-orders">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{po.poNumber}</h1>
                            <Badge variant="outline" className={`capitalize ${getStatusColor(po.status)}`}>
                                {po.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(po.poDate), 'dd MMMM yyyy')}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handleDownloadPdf}>
                        <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={handlePrint}>
                        <Printer className="h-4 w-4" /> Print
                    </Button>
                    {po.status === POStatus.draft && (
                        <>
                            <Button variant="outline" className="gap-2" onClick={() => router.push(`/purchase-orders/${po.id}/edit`)}>
                                <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            <Button
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                                onClick={handleSubmit}
                                disabled={processing}
                            >
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                Submit
                            </Button>
                            <Button
                                variant="destructive"
                                className="gap-2"
                                onClick={handleDelete}
                                disabled={deleting || processing}
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Delete
                            </Button>
                        </>
                    )}

                    {po.status === POStatus.pending_approval && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={handleReject}
                                disabled={processing}
                            >
                                <AlertCircle className="h-4 w-4" /> Reject
                            </Button>
                            <Button
                                className="gap-2 bg-green-600 hover:bg-green-700"
                                onClick={handleApprove}
                                disabled={processing}
                            >
                                <CheckCircle className="h-4 w-4" /> Approve
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4">
                {/* Vendor Info */}
                <Card className="print:shadow-none print:border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vendor Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg no-print">
                                <Building2 className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{po.vendor?.companyName}</h3>
                                <p className="text-sm text-muted-foreground">{po.vendor?.vendorCode}</p>
                                <p className="text-sm text-indigo-600 mt-1">{po.vendor?.email}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Info */}
                <Card className="print:shadow-none print:border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Delivery Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 no-print" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Expected Delivery</p>
                                    <p className="font-medium text-sm">
                                        {po.deliveryDate ? format(new Date(po.deliveryDate), 'dd MMM yyyy') : 'Not specified'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 no-print" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                                    <p className="font-medium text-sm">{po.deliveryAddress || 'Factory Gate'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Terms */}
                <Card className="print:shadow-none print:border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Terms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-muted-foreground">Payment Terms</p>
                                <p className="font-medium text-sm">{po.paymentTerms || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Job Work Type</p>
                                <Badge variant="secondary" className="mt-1 print:border print:bg-transparent">{po.jobWorkType.replace('_', ' ')}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Line Items */}
            <Card className="mb-8 print:shadow-none print:border-0">
                <CardHeader className="print:hidden">
                    <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Part Details</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {po.items?.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.partNumber}</div>
                                        {item.partDescription && <div className="text-sm text-muted-foreground">{item.partDescription}</div>}
                                        {item.hsnCode && <Badge variant="outline" className="text-[10px] mt-1 print:border print:text-black">HSN: {item.hsnCode}</Badge>}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{item.quantity}</span>
                                        <span className="text-xs text-muted-foreground ml-1">{item.unitOfMeasure}</span>
                                    </TableCell>
                                    <TableCell>₹{item.ratePerPiece.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        ₹{item.amount.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Totals & Remarks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
                <div>
                    <h3 className="font-semibold mb-2">Remarks / Instructions</h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border text-sm text-muted-foreground min-h-[120px] print:bg-transparent print:border-gray-300">
                        {po.rejectionReason && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-red-800">
                                <span className="font-semibold">Rejection Reason:</span> {po.rejectionReason}
                            </div>
                        )}
                        {po.remarks || "No additional remarks."}
                    </div>
                </div>

                <div>
                    <Card className="print:shadow-none print:border-0">
                        <CardContent className="p-6 space-y-3 print:p-0">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>₹{po.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">IGST (18%)</span>
                                <span>₹{po.igst.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">CGST</span>
                                <span>₹{po.cgst.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">SGST</span>
                                <span>₹{po.sgst.toLocaleString()}</span>
                            </div>
                            <div className="border-t pt-4 mt-2 flex justify-between items-center">
                                <span className="font-bold text-lg">Total Amount</span>
                                <span className="font-bold text-xl text-indigo-600 print:text-black">₹{po.totalAmount.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block mt-20 pt-8 border-t text-center text-sm text-gray-400">
                <p>This is a computer-generated document and does not require a signature.</p>
                <p>Generated by Aaniry VMS on {format(new Date(), 'dd MMMM yyyy HH:mm')}</p>
            </div>
        </div>
    );
}
