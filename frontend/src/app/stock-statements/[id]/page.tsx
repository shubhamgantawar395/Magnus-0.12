"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { stockStatementService } from "@/services/stock-statement-service";
import { StockStatement, StockStatementStatus } from "@/types/stock-statement";
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
import { Loader2, ArrowLeft, Printer, CheckCircle, Store, Calendar, FileText, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import toast from 'react-hot-toast';

export default function StockStatementDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const [statement, setStatement] = useState<StockStatement | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadStatement(params.id as string);
        }
    }, [params.id]);

    const loadStatement = async (id: string) => {
        try {
            setLoading(true);
            const data = await stockStatementService.getById(id);
            setStatement(data);
        } catch (error) {
            console.error("Failed to load statement", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!confirm(`Are you sure you want to mark this statement as ${newStatus}?`)) return;
        setProcessing(true);
        try {
            await stockStatementService.update(statement!.id, { status: newStatus });
            loadStatement(statement!.id);
        } catch (error: any) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        } finally {
            setProcessing(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusColor = (status: StockStatementStatus) => {
        switch (status) {
            case StockStatementStatus.approved: return "bg-green-100 text-green-800 border-green-200";
            case StockStatementStatus.verified: return "bg-blue-100 text-blue-800 border-blue-200";
            case StockStatementStatus.submitted: return "bg-orange-100 text-orange-800 border-orange-200";
            case StockStatementStatus.draft: return "bg-slate-100 text-slate-800 border-slate-200";
            default: return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!statement) return null;

    return (
        <div className="container mx-auto py-10 max-w-6xl print:p-0 print:max-w-none">
            {/* Print Header */}
            <div className="hidden print:block mb-8 border-b pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">STOCK STATEMENT</h1>
                        <p className="text-sm text-gray-500">Aaniry VMS</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold">{statement.statementNumber}</h2>
                        <p className="text-sm">Generated: {format(new Date(statement.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* Header / Nav */}
            <div className="flex justify-between items-start mb-8 no-print">
                <div className="flex items-center gap-4">
                    <Link href="/stock-statements">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {statement.statementNumber}
                            </h1>
                            <Badge variant="outline" className={`capitalize ${getStatusColor(statement.status)}`}>
                                {statement.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            Period: {format(new Date(statement.periodFrom), 'dd MMM yyyy')} - {format(new Date(statement.periodTo), 'dd MMM yyyy')}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={handlePrint}>
                        <Printer className="h-4 w-4" /> Print
                    </Button>

                    {statement.status === StockStatementStatus.draft && (
                        <Button
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleUpdateStatus(StockStatementStatus.submitted)}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Submit
                        </Button>
                    )}

                    {statement.status === StockStatementStatus.submitted && (
                        <Button
                            className="gap-2 bg-green-600 hover:bg-green-700"
                            onClick={() => handleUpdateStatus(StockStatementStatus.verified)}
                            disabled={processing}
                        >
                            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Verify
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4">
                {/* Vendor Info */}
                <Card className="print:shadow-none print:border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vendor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg no-print">
                                <Store className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">{statement.vendor?.companyName}</h3>
                                <p className="text-sm text-muted-foreground">{statement.vendor?.vendorCode}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Managed By */}
                <Card className="print:shadow-none print:border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Managed By</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg no-print">
                                <User className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    {statement.managedBy ? `${statement.managedBy.firstName} ${statement.managedBy.lastName}` : 'System Generated'}
                                </p>
                                <p className="text-xs text-muted-foreground">Creator</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Verification Info */}
                <Card className="print:shadow-none print:border">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Verification</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg no-print">
                                <CheckCircle className="h-5 w-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="font-medium">
                                    {statement.verifiedBy ? `${statement.verifiedBy.firstName} ${statement.verifiedBy.lastName}` : 'Pending Verification'}
                                </p>
                                {statement.verifiedAt && (
                                    <p className="text-xs text-muted-foreground">{format(new Date(statement.verifiedAt), 'dd MMM yyyy')}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stock Items Table */}
            <Card className="mb-8 print:shadow-none print:border-0">
                <CardHeader className="print:hidden">
                    <CardTitle>Stock Reconciliation</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Part Number</TableHead>
                                <TableHead className="text-right">Opening</TableHead>
                                <TableHead className="text-right text-green-600">Inward (+)</TableHead>
                                <TableHead className="text-right text-red-600">Outward (-)</TableHead>
                                <TableHead className="text-right font-bold bg-slate-50">Closing Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {statement.items?.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell className="text-muted-foreground font-mono text-xs">
                                        {(index + 1).toString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.partNumber}</div>
                                        {item.partDescription && <div className="text-xs text-muted-foreground">{item.partDescription}</div>}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {item.openingBalance}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-green-700 bg-green-50/50">
                                        {item.inwardQuantity}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-red-700 bg-red-50/50">
                                        {item.outwardQuantity}
                                    </TableCell>
                                    <TableCell className="text-right font-bold bg-slate-50">
                                        {item.closingBalance}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Footer Remarks */}
            {statement.remarks && (
                <Card className="print:shadow-none print:border-0">
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-2 text-sm">Remarks</h3>
                        <p className="text-sm text-muted-foreground">{statement.remarks}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
