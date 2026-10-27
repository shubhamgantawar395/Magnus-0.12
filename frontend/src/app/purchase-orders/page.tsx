"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { purchaseOrderService } from "@/services/purchase-order-service";
import { PurchaseOrder, POStatus } from "@/types/purchase-order";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Filter, FileText, Mail, Eye, Search, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/auth-store";

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<POStatus | "all">(
        (searchParams.get("status") as POStatus) || "all"
    );
    const [searchQuery, setSearchQuery] = useState("");

    const dashboardHref = (() => {
        const role = user?.role;
        if (!role) return "/dashboard";
        if (["admin", "director", "gm", "ppc_manager", "production_manager"].includes(role)) return "/dashboard/admin";
        if (role === "executive") return "/dashboard/executive";
        if (["vendor", "vendor_owner", "vendor_ppc", "vendor_supervisor", "vendor_user"].includes(role)) return "/dashboard/vendor";
        if (role === "quality_head") return "/dashboard/quality";
        if (role === "platform_admin") return "/dashboard/platform";
        if (role === "customer") return "/dashboard/customer";
        return "/dashboard";
    })();

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const filters: any = {};
            if (statusFilter !== "all") {
                filters.status = statusFilter;
            }
            const data = await purchaseOrderService.getAll(filters);
            setOrders(data);
        } catch (error) {
            console.error("Failed to load POs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, po: PurchaseOrder) => {
        e.stopPropagation();
        if (!confirm(`Delete PO ${po.poNumber}? This cannot be undone.`)) return;
        try {
            await purchaseOrderService.delete(po.id);
            toast.success(`PO ${po.poNumber} deleted`);
            setOrders(prev => prev.filter(o => o.id !== po.id));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Cannot delete — PO must be in Draft status');
        }
    };

    // Client-side search: vendor name, part number, part description/name
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders;
        const q = searchQuery.toLowerCase().trim();
        return orders.filter(po => {
            const vendorMatch = po.vendor?.companyName?.toLowerCase().includes(q);
            const partMatch = po.items?.some(
                (item: any) =>
                    item.partNumber?.toLowerCase().includes(q) ||
                    item.partDescription?.toLowerCase().includes(q)
            );
            return vendorMatch || partMatch;
        });
    }, [orders, searchQuery]);

    const handleEmailPO = (e: React.MouseEvent, po: PurchaseOrder) => {
        e.stopPropagation();
        const vendorName = po.vendor?.companyName || "Vendor";
        const subject = encodeURIComponent(`Purchase Order: ${po.poNumber}`);
        const body = encodeURIComponent(
            `Dear ${vendorName},\n\nPlease find the details of Purchase Order ${po.poNumber} dated ${format(new Date(po.poDate), 'dd MMM yyyy')}.\n\nTotal Amount: ₹${po.totalAmount.toLocaleString()}\n\nKindly acknowledge receipt of this PO.\n\nRegards`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
        toast.success(`Email draft created for ${po.poNumber}`);
    };

    const getStatusColor = (status: POStatus) => {
        switch (status) {
            case POStatus.approved: return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
            case POStatus.pending_approval: return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
            case POStatus.rejected: return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
            case POStatus.draft: return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
            case POStatus.completed: return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    return (
        <div className="container mx-auto py-10 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Purchase Orders</h1>
                    <p className="text-muted-foreground">Manage and track procurement orders.</p>
                </div>
                <Link href="/purchase-orders/create">
                    <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="h-4 w-4" /> Create New PO
                    </Button>
                </Link>
                <Link href={dashboardHref}>
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Return to Dashboard
                    </Button>
                </Link>
            </div>

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Status:</span>
                    </div>
                    <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value={POStatus.draft}>Draft</SelectItem>
                            <SelectItem value={POStatus.pending_approval}>Pending Approval</SelectItem>
                            <SelectItem value={POStatus.approved}>Approved</SelectItem>
                            <SelectItem value={POStatus.rejected}>Rejected</SelectItem>
                            <SelectItem value={POStatus.in_progress}>In Progress</SelectItem>
                            <SelectItem value={POStatus.completed}>Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Search bar */}
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by vendor, part number or part name..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* PO Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PO Number</TableHead>
                                <TableHead>Vendor</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                                            <span>Loading orders...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-8 w-8 opacity-20" />
                                            <p>{searchQuery ? `No results for "${searchQuery}"` : "No purchase orders found."}</p>
                                            {!searchQuery && (
                                                <Button variant="link" onClick={() => router.push('/purchase-orders/create')}>
                                                    Create your first PO
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((po) => (
                                    <TableRow
                                        key={po.id}
                                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        onClick={() => router.push(`/purchase-orders/${po.id}`)}
                                    >
                                        <TableCell className="font-medium font-mono text-indigo-600">
                                            {po.poNumber}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{po.vendor?.companyName}</span>
                                                <span className="text-xs text-muted-foreground">{po.vendor?.vendorCode}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(po.poDate), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold">₹{po.totalAmount.toLocaleString()}</span>
                                            <div className="text-xs text-muted-foreground">
                                                Sub: ₹{po.subtotal.toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`capitalize border-0 ${getStatusColor(po.status)}`}>
                                                {po.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">
                                                {po.createdBy?.firstName} {po.createdBy?.lastName}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="gap-1"
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${po.id}`); }}
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </Button>
                                                {po.status === POStatus.draft && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/purchase-orders/${po.id}/edit`); }}
                                                    >
                                                        <Pencil className="h-4 w-4" /> Edit
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                    onClick={(e) => handleEmailPO(e, po)}
                                                >
                                                    <Mail className="h-4 w-4" /> Email
                                                </Button>
                                                {po.status === POStatus.draft && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                                        onClick={(e) => handleDelete(e, po)}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Delete
                                                    </Button>
                                                )}
                                            </div>
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
