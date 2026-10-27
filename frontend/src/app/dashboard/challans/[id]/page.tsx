'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft, Printer, Download, Truck, CheckCircle2, XCircle,
    Clock, Package, FileText, Loader2, Building2, Calendar, Hash, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    issued: { label: 'Issued — Awaiting Receipt', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
    received: { label: 'Fully Received', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    partial: { label: 'Partially Received', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Clock },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export default function ChallanDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [challan, setChallan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (id) loadChallan(id as string);
    }, [id]);

    const loadChallan = async (challanId: string) => {
        try {
            const res = await apiClient.get(`/challans/${challanId}`);
            setChallan(res.data);
        } catch {
            toast.error('Failed to load challan');
            router.push('/dashboard/challans');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status: string) => {
        if (!challan) return;
        setUpdatingStatus(true);
        try {
            await apiClient.patch(`/challans/${challan.id}/status`, { status });
            setChallan({ ...challan, status });
            toast.success(`Status updated to ${status}`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDownload = async () => {
        if (!challan) return;
        setDownloading(true);
        try {
            const res = await apiClient.get(`/challans/${challan.id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${challan.challanNumber}.pdf`;
            a.click();
            a.remove();
        } catch {
            toast.error('PDF generation failed');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    );

    if (!challan) return null;

    const cfg = STATUS_CONFIG[challan.status] || STATUS_CONFIG.issued;
    const StatusIcon = cfg.icon;
    const totalAmount = challan.items?.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0) || 0;

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            {/* Top Nav */}
            <div className="flex items-center justify-between mb-8 no-print">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/challans')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{challan.challanNumber}</h1>
                        <p className="text-sm text-muted-foreground">
                            {format(new Date(challan.challanDate), 'dd MMMM yyyy')}
                            {challan.copyType && <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded">{challan.copyType}</span>}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" /> {cfg.label}
                    </span>
                </div>

                <div className="flex gap-2">
                    {/* Status Action Buttons */}
                    {challan.status === 'issued' && (
                        <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleStatusUpdate('received')} disabled={updatingStatus}>
                            {updatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Mark Received
                        </Button>
                    )}
                    {challan.status === 'issued' && (
                        <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() => handleStatusUpdate('cancelled')} disabled={updatingStatus}>
                            <XCircle className="h-3 w-3" /> Cancel
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                        <Printer className="h-4 w-4" /> Print
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload} disabled={downloading}>
                        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        PDF
                    </Button>
                </div>
            </div>

            {/* Challan Document */}
            <div className="space-y-6 print:space-y-4">
                {/* Document Header */}
                <Card className="border-2">
                    <CardContent className="pt-6 pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Delivery Challan</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">For Job Work (Rule 45/55 CGST Rules 2017)</p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold font-mono">{challan.challanNumber}</p>
                                <p className="text-sm text-muted-foreground">{format(new Date(challan.challanDate), 'dd MMM yyyy')}</p>
                                {challan.copyType && (
                                    <Badge variant="outline" className="mt-1 text-xs">{challan.copyType}</Badge>
                                )}
                            </div>
                        </div>

                        {challan.poNumber && (
                            <div className="mt-3 p-2 bg-indigo-50 rounded border border-indigo-100 flex items-center gap-2 text-sm">
                                <Hash className="h-4 w-4 text-indigo-500" />
                                <span className="text-muted-foreground">Against Purchase Order:</span>
                                <span className="font-semibold font-mono text-indigo-700">{challan.poNumber}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Party Info */}
                <div className="grid grid-cols-2 gap-4">
                    {/* From */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5" /> From (Consignor)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                // Prefer plant-specific issuerDetails snapshot saved at challan creation
                                const isr = challan.issuerDetails
                                    ? (typeof challan.issuerDetails === 'string' ? JSON.parse(challan.issuerDetails) : challan.issuerDetails)
                                    : null;
                                const name = isr?.name || challan.organization?.name;
                                const address = isr?.address || challan.organization?.address;
                                const cityState = [isr?.city || challan.organization?.city, isr?.state || challan.organization?.state].filter(Boolean).join(', ');
                                const pincode = isr?.pincode || challan.organization?.pincode;
                                const gstin = isr?.gstin || challan.organization?.gstin;
                                if (!name) return <p className="text-sm text-muted-foreground italic">—</p>;
                                return (
                                    <>
                                        <p className="font-bold text-base">{name}</p>
                                        {address && <p className="text-sm text-muted-foreground mt-1">{address}</p>}
                                        <p className="text-sm text-muted-foreground">{cityState}{pincode ? ` — ${pincode}` : ''}</p>
                                        {gstin && <p className="text-xs font-mono mt-2 text-indigo-600">GSTIN: {gstin}</p>}
                                    </>
                                );
                            })()}
                        </CardContent>
                    </Card>

                    {/* To */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Truck className="h-3.5 w-3.5" /> To (Consignee / Vendor)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-bold text-base">{challan.vendor?.companyName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{challan.vendor?.vendorCode}</p>
                            {challan.vendor?.address && (
                                <p className="text-sm text-muted-foreground mt-1">{challan.vendor.address}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{[challan.vendor?.city, challan.vendor?.state].filter(Boolean).join(', ')}</p>
                            {challan.vendor?.gstin && (
                                <p className="text-xs font-mono mt-2 text-indigo-600">GSTIN: {challan.vendor.gstin}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Items Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                            <Package className="h-4 w-4" /> Material Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr className="text-xs uppercase text-muted-foreground">
                                    <th className="text-left px-4 py-3">#</th>
                                    <th className="text-left px-4 py-3">Part No.</th>
                                    <th className="text-left px-4 py-3">Description</th>
                                    <th className="text-left px-4 py-3">HSN</th>
                                    <th className="text-left px-4 py-3">Material Grade</th>
                                    <th className="text-right px-4 py-3">Qty</th>
                                    <th className="text-left px-4 py-3">UOM</th>
                                    <th className="text-right px-4 py-3">Rate (₹)</th>
                                    <th className="text-right px-4 py-3">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {(challan.items || []).map((item: any, idx: number) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                                        <td className="px-4 py-3 font-mono font-semibold text-indigo-700">{item.partNumber}</td>
                                        <td className="px-4 py-3">
                                            <div>{item.partDescription || '—'}</div>
                                            {item.drawingReference && (
                                                <div className="text-xs text-muted-foreground">Drg: {item.drawingReference}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono">{item.hsnCode || '—'}</td>
                                        <td className="px-4 py-3 text-xs">{item.materialGrade || '—'}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{item.quantityIssued}</td>
                                        <td className="px-4 py-3 text-xs">{item.unitOfMeasure || 'NOS'}</td>
                                        <td className="px-4 py-3 text-right text-xs">
                                            {item.unitPrice ? `₹${item.unitPrice.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold">
                                            {item.totalAmount ? `₹${item.totalAmount.toLocaleString()}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2">
                                <tr className="font-bold">
                                    <td colSpan={5} className="px-4 py-3 text-sm text-right text-muted-foreground">Totals:</td>
                                    <td className="px-4 py-3 text-right">{challan.totalQuantity}</td>
                                    <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground text-sm">Grand Total</td>
                                    <td className="px-4 py-3 text-right text-indigo-700">
                                        {totalAmount > 0 ? `₹${totalAmount.toLocaleString()}` : '—'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </CardContent>
                </Card>

                {/* Transport + Meta */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Truck className="h-3.5 w-3.5" /> Transport Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {[
                                ['Mode', challan.transportMode],
                                ['Vehicle No.', challan.vehicleNumber],
                                ['Transporter', challan.transporterName],
                                ['Driver', challan.driverName],
                                ['Driver Ph.', challan.driverPhone],
                                ['E-Way Bill', challan.ewayBillNumber],
                                ['E-Way Date', challan.ewayBillDate ? format(new Date(challan.ewayBillDate), 'dd MMM yyyy') : null],
                            ].filter(([_, v]) => v).map(([label, value]) => (
                                <div key={label as string} className="flex justify-between">
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="font-medium">{value}</span>
                                </div>
                            ))}
                            {!challan.vehicleNumber && !challan.driverName && !challan.ewayBillNumber && (
                                <p className="text-muted-foreground italic text-xs">No transport details recorded</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Document Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created By</span>
                                <span className="font-medium">
                                    {challan.createdBy ? `${challan.createdBy.firstName} ${challan.createdBy.lastName}` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Created At</span>
                                <span className="font-medium">
                                    {challan.createdAt ? format(new Date(challan.createdAt), 'dd MMM yyyy, HH:mm') : '—'}
                                </span>
                            </div>
                            {challan.placeOfSupply && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Place of Supply</span>
                                    <span className="font-medium">{challan.placeOfSupply}</span>
                                </div>
                            )}
                            {challan.remarks && (
                                <div className="pt-2 border-t">
                                    <p className="text-muted-foreground text-xs mb-1">Remarks</p>
                                    <p className="text-sm">{challan.remarks}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Job Process Status (if any) */}
                {challan.items?.some((i: any) => i.jobProcesses?.length > 0) && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Job Process Tracking</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <table className="w-full text-xs">
                                <thead className="border-b text-muted-foreground uppercase">
                                    <tr>
                                        <th className="text-left pb-2">Part</th>
                                        <th className="text-left pb-2">Process</th>
                                        <th className="text-left pb-2">Status</th>
                                        <th className="text-right pb-2">Completed</th>
                                        <th className="text-right pb-2">Rejected</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {challan.items.flatMap((item: any) =>
                                        (item.jobProcesses || []).map((jp: any) => (
                                            <tr key={jp.id}>
                                                <td className="py-1.5 font-mono text-indigo-600">{item.partNumber}</td>
                                                <td className="py-1.5">{jp.processName}</td>
                                                <td className="py-1.5">
                                                    <Badge variant="outline" className="text-[10px]">{jp.status}</Badge>
                                                </td>
                                                <td className="py-1.5 text-right text-green-600 font-semibold">{jp.completedQuantity ?? '—'}</td>
                                                <td className="py-1.5 text-right text-red-500">{jp.rejectedQuantity ?? '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                )}

                {/* Signature Row */}
                <div className="grid grid-cols-3 gap-4 mt-8 print:mt-16">
                    {['Prepared By', 'Authorized Signatory', 'Receiver\'s Signature'].map(label => (
                        <div key={label} className="text-center">
                            <div className="h-14 border-b border-dashed border-slate-400"></div>
                            <p className="text-xs text-muted-foreground mt-2">{label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
