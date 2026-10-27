"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { stockStatementService } from "@/services/stock-statement-service";
import { StockStatement, StockStatementStatus } from "@/types/stock-statement";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Filter, FileText, Calendar } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function StockStatementsPage() {
    const router = useRouter();
    const [statements, setStatements] = useState<StockStatement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatements();
    }, []);

    const loadStatements = async () => {
        try {
            setLoading(true);
            const data = await stockStatementService.getAll();
            setStatements(data);
        } catch (error) {
            console.error("Failed to load stock statements", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: StockStatementStatus) => {
        switch (status) {
            case StockStatementStatus.approved: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
            case StockStatementStatus.verified: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
            case StockStatementStatus.submitted: return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
            case StockStatementStatus.draft: return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Stock Statements</h1>
                    <p className="text-muted-foreground">Manage and verify monthly vendor stock statements.</p>
                </div>
                <Link href="/stock-statements/create">
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4" /> Generate Statement
                    </Button>
                </Link>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Statement #</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Managed By</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                                            <span>Loading statements...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : statements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-8 w-8 opacity-20" />
                                            <p>No stock statements found.</p>
                                            <Button variant="link" onClick={() => router.push('/stock-statements/create')}>
                                                Generate your first statement
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                statements.map((stmt) => (
                                    <TableRow key={stmt.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => router.push(`/stock-statements/${stmt.id}`)}>
                                        <TableCell className="font-medium font-mono text-indigo-600">
                                            {stmt.statementNumber}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{stmt.vendor?.companyName}</span>
                                                <span className="text-xs text-muted-foreground">{stmt.vendor?.vendorCode}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                <span>
                                                    {format(new Date(stmt.periodFrom), 'MMM yyyy')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {stmt.managedBy ? (
                                                <span className="text-sm">
                                                    {stmt.managedBy.firstName} {stmt.managedBy.lastName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize border-0 ${getStatusColor(stmt.status)}`}>
                                                {stmt.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/stock-statements/${stmt.id}`);
                                            }}>
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
