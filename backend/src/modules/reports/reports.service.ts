import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallanStatus, CustomerOrderStatus } from '@prisma/client';

export interface ChallanItemStock {
    challanNumber: string;
    challanDate: Date;
    itemName: string;
    partNumber: string;
    partDescription?: string;
    oemChallanQty: number;
    dispatchQty: number;
    balanceQty: number;
}

export interface StockStatementData {
    vendorId: string;
    vendorName: string;
    month: number;
    year: number;
    items: ChallanItemStock[];
    summary: {
        totalIssued: number;
        totalDispatched: number;
        totalBalance: number;
    };
}

// ─── Vendor Wise Stock Statement ──────────────────────────────────────────────

export interface VendorWiseRow {
    srNo: number;
    challanNumber: string;
    challanDate: Date;
    itemName: string;
    partNumber: string;
    partName: string;
    materialType: string | null;
    supplierName: string | null;
    dispatchTarget: number;
    challanQty: number;
    dispatchQty: number;
    balanceQty: number;
    castingDefects: number;   // QualityCheck rejectedQty
    rejections: number;       // JobProcess.rejectedQuantity total
    wip: number;              // issued - completed - rejected (in-process)
    // ── Supplier inward fields (new) ──
    storeBalance: number;        // GRN accepted qty − all challans dispatched (available in store)
    pendingFromSupplier: number; // Open PO qty − GRN received qty (yet to arrive)
    priority: 'urgent' | 'at_risk' | 'on_track' | 'ok';
}

export interface VendorWiseStockData {
    vendorId: string;
    vendorName: string;
    rows: VendorWiseRow[];
    totals: {
        challanQty: number;
        dispatchQty: number;
        balanceQty: number;
        castingDefects: number;
        rejections: number;
        wip: number;
        storeBalance: number;
        pendingFromSupplier: number;
        urgentParts: number;
    };
}

// ─── Global Stock Statement (Part-centric) ────────────────────────────────────

export interface VendorStockBreakdown {
    vendorId: string;
    vendorName: string;
    vendorCode: string;
    balance: number;
    currentStage: string | null;
    wip: number;
}

export interface OperationStockData {
    sequenceNumber: number;
    operationName: string;
    executionType: 'inhouse' | 'outsourced';
    assignedTo: string;     // 'In-house' or vendor company name
    vendorId: string | null;
    qtySent: number;        // auto from issued challans for this op
    qtyReceived: number;    // completed qty at this operation
    qtyInProgress: number;  // sent but not yet completed/returned
}

export interface GlobalStockRow {
    srNo: number;
    partNumber: string;
    partName: string;
    endCustomer: string | null;
    // ── New supplier / material fields
    materialType: string | null;
    supplierName: string | null;
    supplierId: string | null;
    // ── Qty columns
    customerRequiredQty: number;
    qtyOrderedThisMonth: number;      // from active PO items this calendar month
    qtyReceivedTillNow: number;       // total returned via vendor tax invoices (cumulative)
    totalProcured: number;
    totalDispatchedBack: number;
    balanceAtVendors: number;
    totalRejected: number;
    readyForDispatch: number;         // completed all ops but not yet dispatched
    dispatchTarget: number;           // editable, stored on Part
    // ── Supplier inward fields (new) ──
    receivedFromSupplier: number;     // total GRN accepted qty for this part
    storeBalance: number;             // GRN accepted − challan dispatched (in OEM store)
    pendingFromSupplier: number;      // open PO qty − GRN received (carry-forward)
    // ── Operation sequences
    operations: OperationStockData[];
    vendorBreakdown: VendorStockBreakdown[];
    lastChallanDate: Date | null;
    // ── Priority (auto)
    priority: 'urgent' | 'at_risk' | 'on_track' | 'ok';
}

export interface GlobalStockData {
    rows: GlobalStockRow[];
    totals: {
        customerRequiredQty: number;
        qtyOrderedThisMonth: number;
        totalProcured: number;
        totalDispatchedBack: number;
        balanceAtVendors: number;
        totalRejected: number;
        readyForDispatch: number;
        receivedFromSupplier: number;
        storeBalance: number;
        pendingFromSupplier: number;
    };
}

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    // ─── Existing Methods ─────────────────────────────────────────────────────

    async getStockStatement(vendorId: string, month: number, year: number): Promise<StockStatementData> {
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new Error('Vendor not found');

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const challans = await this.prisma.deliveryChallan.findMany({
            where: { vendorId, challanDate: { lte: endDate } },
            include: { items: { include: { vendorInvoiceItems: { include: { invoice: { select: { status: true } } } } } } },
            orderBy: { challanDate: 'asc' }
        });

        const stockItems: ChallanItemStock[] = [];
        let totalIssued = 0, totalDispatched = 0, totalBalance = 0;

        for (const challan of challans) {
            for (const item of challan.items) {
                // Only count gate-verified qty from gate_approved / approved / paid invoices
                const dispatchQty = (item.vendorInvoiceItems as any[])
                    .filter(inv => ['gate_approved', 'approved', 'paid'].includes(inv.invoice?.status))
                    .reduce((sum: number, inv: any) => sum + (inv.gateReceivedQty ?? inv.invoiceQuantity), 0);
                const balanceQty = item.quantityIssued - dispatchQty;
                const isInMonth = challan.challanDate >= startDate && challan.challanDate <= endDate;
                if (balanceQty > 0 || isInMonth) {
                    stockItems.push({
                        challanNumber: challan.challanNumber,
                        challanDate: challan.challanDate,
                        itemName: `${item.partNumber}${item.partDescription ? ' - ' + item.partDescription : ''}`,
                        partNumber: item.partNumber,
                        partDescription: item.partDescription || undefined,
                        oemChallanQty: item.quantityIssued,
                        dispatchQty,
                        balanceQty
                    });
                    totalIssued += item.quantityIssued;
                    totalDispatched += dispatchQty;
                    totalBalance += balanceQty;
                }
            }
        }

        return { vendorId, vendorName: vendor.companyName, month, year, items: stockItems, summary: { totalIssued, totalDispatched, totalBalance } };
    }

    async getVendorPerformance(vendorId: string, startDate: Date, endDate: Date) {
        const challans = await this.prisma.deliveryChallan.findMany({
            where: { vendorId, challanDate: { gte: startDate, lte: endDate } },
            include: { items: { include: { jobProcesses: true } } }
        });

        let totalIssued = 0, totalCompleted = 0, totalRejected = 0;
        challans.forEach(c => c.items.forEach(item => {
            totalIssued += item.quantityIssued;
            item.jobProcesses.forEach(p => {
                totalCompleted += p.completedQuantity;
                totalRejected += p.rejectedQuantity;
            });
        }));

        return {
            vendorId,
            period: { startDate, endDate },
            metrics: {
                totalChallans: challans.length,
                totalIssued,
                totalCompleted,
                totalRejected,
                totalPending: totalIssued - totalCompleted - totalRejected,
                rejectionRate: totalIssued > 0 ? (totalRejected / totalIssued) * 100 : 0,
                completionRate: totalIssued > 0 ? (totalCompleted / totalIssued) * 100 : 0
            }
        };
    }

    // ─── Vendor Wise Stock Statement ──────────────────────────────────────────

    async getVendorWiseStockStatement(
        orgId: string,
        vendorId?: string,
        search?: string,
        dateFrom?: Date,
        dateTo?: Date,
        materialType?: string,
    ): Promise<VendorWiseStockData[]> {

        // ── 0. Part master for enrichment ──────────────────────────────────────
        const parts = await this.prisma.part.findMany({
            where: { organizationId: orgId, isActive: true },
            select: {
                partNumber: true,
                partName: true,
                materialType: true as any,
                supplierId: true as any,
                dispatchTarget: true as any,
                supplier: { select: { companyName: true } } as any,
            },
        }) as any[];

        interface PartInfo {
            partName: string;
            materialType: string | null;
            supplierName: string | null;
            dispatchTarget: number;
        }
        const partInfoMap = new Map<string, PartInfo>();
        for (const p of parts) {
            partInfoMap.set(p.partNumber, {
                partName: p.partName || '',
                materialType: p.materialType || null,
                supplierName: p.supplier?.companyName || null,
                dispatchTarget: p.dispatchTarget || 0,
            });
        }

        // Build where clause — filter via vendor's organizationId (challans may have null organizationId)
        const where: any = { vendor: { organizationId: orgId } };
        if (vendorId) where.vendorId = vendorId;
        if (dateFrom || dateTo) {
            where.challanDate = {};
            if (dateFrom) where.challanDate.gte = dateFrom;
            if (dateTo) where.challanDate.lte = dateTo;
        }

        const challans = await this.prisma.deliveryChallan.findMany({
            where,
            include: {
                vendor: { select: { id: true, companyName: true } },
                items: {
                    include: {
                        jobProcesses: {
                            select: {
                                processName: true,
                                completedQuantity: true,
                                rejectedQuantity: true,
                                reworkQuantity: true,
                                processSequence: true,
                            }
                        },
                        vendorInvoiceItems: { include: { invoice: { select: { status: true } } } },
                    }
                }
            },
            orderBy: [{ vendor: { companyName: 'asc' } }, { challanDate: 'asc' }]
        }) as any[];

        // ── Store balance: GRN accepted − all challan dispatched per part ───────
        const grnItems = await this.prisma.supplierGRNItem.findMany({
            where: { grn: { organizationId: orgId } },
            select: { partNumber: true, receivedQty: true, rejectedQty: true },
        });
        const grnAcceptedMap = new Map<string, number>();
        for (const gi of grnItems) {
            const accepted = gi.receivedQty - gi.rejectedQty;
            grnAcceptedMap.set(gi.partNumber, (grnAcceptedMap.get(gi.partNumber) || 0) + accepted);
        }
        // Total challan dispatched per part (all challans, not just filtered ones)
        const allChallanItems = await this.prisma.challanItem.findMany({
            where: { challan: { vendor: { organizationId: orgId }, status: { notIn: ['rejected'] as any } } },
            select: { partNumber: true, quantityIssued: true },
        });
        const totalChallanDispatchedMap = new Map<string, number>();
        for (const ci of allChallanItems) {
            totalChallanDispatchedMap.set(ci.partNumber, (totalChallanDispatchedMap.get(ci.partNumber) || 0) + ci.quantityIssued);
        }
        // PO pending per part (open POs - GRN received against those POs)
        const poItems = await this.prisma.pOItem.findMany({
            where: { po: { organizationId: orgId, status: { in: ['approved', 'in_progress'] as any } } },
            select: { partNumber: true, quantity: true, grnItems: { select: { receivedQty: true } } },
        });
        const poPendingMap = new Map<string, number>();
        for (const pi of poItems) {
            const received = pi.grnItems.reduce((s: number, g: any) => s + g.receivedQty, 0);
            poPendingMap.set(pi.partNumber, (poPendingMap.get(pi.partNumber) || 0) + Math.max(0, pi.quantity - received));
        }

        // Group by vendor
        const vendorMap = new Map<string, { name: string; rows: VendorWiseRow[] }>();

        let globalSrNo = 1;
        for (const challan of challans) {
            const vId = challan.vendorId;
            if (!vendorMap.has(vId)) {
                vendorMap.set(vId, { name: challan.vendor.companyName, rows: [] });
            }
            const entry = vendorMap.get(vId)!;

            for (const item of challan.items) {
                const itemLabel = `${item.partNumber}${item.partDescription ? ' — ' + item.partDescription : ''}`;

                // Apply search filter
                const partInfo = partInfoMap.get(item.partNumber);
                if (search) {
                    const s = search.toLowerCase();
                    const matches = challan.challanNumber.toLowerCase().includes(s)
                        || itemLabel.toLowerCase().includes(s)
                        || challan.vendor.companyName.toLowerCase().includes(s)
                        || (partInfo?.partName || '').toLowerCase().includes(s)
                        || (partInfo?.supplierName || '').toLowerCase().includes(s);
                    if (!matches) continue;
                }

                // Material type filter
                if (materialType && partInfo?.materialType !== materialType) continue;

                // Only count gate-verified qty from gate_approved / approved / paid invoices
                const dispatchQty = (item.vendorInvoiceItems as any[])
                    .filter(inv => ['gate_approved', 'approved', 'paid'].includes(inv.invoice?.status))
                    .reduce((sum: number, inv: any) => sum + (inv.gateReceivedQty ?? inv.invoiceQuantity), 0);
                const balanceQty = Math.max(0, item.quantityIssued - dispatchQty);

                // Casting/Forging defects = rejections at the FIRST process stage (sequence=1 or lowest)
                const firstStageProcess = item.jobProcesses.reduce(
                    (acc: any, p: any) => (!acc || (p.processSequence ?? 99) < (acc.processSequence ?? 99)) ? p : acc,
                    null
                );
                const castingDefects = firstStageProcess?.rejectedQuantity ?? 0;

                // Job process rejections and WIP
                const totalCompleted = item.jobProcesses.reduce((sum, p) => sum + p.completedQuantity, 0);
                const totalRejected = item.jobProcesses.reduce((sum, p) => sum + p.rejectedQuantity, 0);
                const wip = Math.max(0, item.quantityIssued - totalCompleted - totalRejected);

                // Priority: based on balance vs dispatchTarget and days since challan
                const target = partInfo?.dispatchTarget ?? 0;
                const daysSinceChallan = Math.floor((Date.now() - new Date(challan.challanDate).getTime()) / 86_400_000);
                let priority: 'urgent' | 'at_risk' | 'on_track' | 'ok' = 'ok';
                if (totalRejected > 0 && totalRejected >= item.quantityIssued * 0.3) {
                    priority = 'urgent';
                } else if (target > 0 && balanceQty >= target) {
                    priority = 'urgent';
                } else if (daysSinceChallan > 30 && balanceQty > 0) {
                    priority = 'at_risk';
                } else if (target > 0 && balanceQty >= target * 0.7) {
                    priority = 'on_track';
                } else if (balanceQty === 0) {
                    priority = 'ok';
                } else if (wip > 0) {
                    priority = 'on_track';
                }

                const partGrnAccepted = grnAcceptedMap.get(item.partNumber) || 0;
                const partTotalDispatched = totalChallanDispatchedMap.get(item.partNumber) || 0;
                const storeBalance = Math.max(0, partGrnAccepted - partTotalDispatched);
                const pendingFromSupplier = poPendingMap.get(item.partNumber) || 0;

                entry.rows.push({
                    srNo: globalSrNo++,
                    challanNumber: challan.challanNumber,
                    challanDate: challan.challanDate,
                    itemName: itemLabel,
                    partNumber: item.partNumber,
                    partName: partInfo?.partName || '',
                    materialType: partInfo?.materialType || null,
                    supplierName: partInfo?.supplierName || null,
                    dispatchTarget: partInfo?.dispatchTarget || 0,
                    challanQty: item.quantityIssued,
                    dispatchQty,
                    balanceQty,
                    castingDefects,
                    rejections: totalRejected,
                    wip,
                    storeBalance,
                    pendingFromSupplier,
                    priority,
                });
            }
        }

        // Convert to result array — sort rows: urgent first, then at_risk, then by challan date desc
        const priorityOrder = { urgent: 0, at_risk: 1, on_track: 2, ok: 3 };
        const result: VendorWiseStockData[] = [];
        for (const [vId, { name, rows }] of vendorMap) {
            if (rows.length === 0) continue;
            rows.sort((a, b) => (priorityOrder[a.priority] - priorityOrder[b.priority])
                || (new Date(b.challanDate).getTime() - new Date(a.challanDate).getTime()));
            // Re-number after sort
            rows.forEach((r, i) => { r.srNo = i + 1; });
            result.push({
                vendorId: vId,
                vendorName: name,
                rows,
                totals: {
                    challanQty: rows.reduce((s, r) => s + r.challanQty, 0),
                    dispatchQty: rows.reduce((s, r) => s + r.dispatchQty, 0),
                    balanceQty: rows.reduce((s, r) => s + r.balanceQty, 0),
                    castingDefects: rows.reduce((s, r) => s + r.castingDefects, 0),
                    rejections: rows.reduce((s, r) => s + r.rejections, 0),
                    wip: rows.reduce((s, r) => s + r.wip, 0),
                    storeBalance: rows.reduce((s, r) => s + r.storeBalance, 0),
                    pendingFromSupplier: rows.reduce((s, r) => s + r.pendingFromSupplier, 0),
                    urgentParts: rows.filter(r => r.priority === 'urgent').length,
                }
            });
        }

        // Sort vendor groups: those with urgent parts first
        result.sort((a, b) => b.totals.urgentParts - a.totals.urgentParts || a.vendorName.localeCompare(b.vendorName));

        return result;
    }

    // ─── Global Stock Statement (Part-centric) ────────────────────────────────

    async getGlobalStockStatement(
        orgId: string,
        search?: string,
        endCustomerId?: string,
        vendorId?: string,
        dateFrom?: Date,
        dateTo?: Date,
    ): Promise<GlobalStockData> {

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // ── 1. Part master with supplier + operations ──────────────────────────
        const parts = await this.prisma.part.findMany({
            where: { organizationId: orgId, isActive: true },
            include: {
                endCustomer: { select: { id: true, name: true } },
                supplier: { select: { id: true, companyName: true } },
                partOperations: {
                    where: { isActive: true },
                    orderBy: { sequenceNumber: 'asc' },
                    include: {
                        // get the vendor linked to this operation (via capability match or direct vendorId if present)
                    },
                },
            },
        });

        interface PartMeta {
            partId: string;
            partName: string;
            endCustomerName: string | null;
            endCustomerId: string | null;
            materialType: string | null;
            supplierName: string | null;
            supplierId: string | null;
            dispatchTarget: number;
            operations: Array<{
                sequenceNumber: number;
                operationName: string;
                executionType: string;
                vendorCapability: string | null;
            }>;
        }

        const partMasterMap = new Map<string, PartMeta>();
        for (const p of parts) {
            partMasterMap.set(p.partNumber, {
                partId: p.id,
                partName: p.partName || '',
                endCustomerName: p.endCustomer?.name || null,
                endCustomerId: p.endCustomer?.id || null,
                materialType: (p as any).materialType || null,
                supplierName: (p as any).supplier?.companyName || null,
                supplierId: (p as any).supplierId || null,
                dispatchTarget: (p as any).dispatchTarget || 0,
                operations: p.partOperations.map(op => ({
                    sequenceNumber: op.sequenceNumber,
                    operationName: op.operationName,
                    executionType: op.executionType,
                    vendorCapability: op.vendorCapability || null,
                })),
            });
        }

        // ── 2. Challan items with job processes ────────────────────────────────
        // Filter via vendor's organizationId (challans may have null organizationId)
        const challanWhere: any = {
            challan: {
                vendor: { organizationId: orgId },
                status: { not: ChallanStatus.rejected },
            },
        };
        if (vendorId) challanWhere.challan.vendorId = vendorId;
        if (dateFrom || dateTo) {
            challanWhere.challan.challanDate = {};
            if (dateFrom) challanWhere.challan.challanDate.gte = dateFrom;
            if (dateTo) challanWhere.challan.challanDate.lte = dateTo;
        }

        const challanItems = await this.prisma.challanItem.findMany({
            where: challanWhere,
            include: {
                challan: {
                    select: {
                        id: true, challanDate: true, vendorId: true,
                        vendor: { select: { id: true, companyName: true, vendorCode: true } },
                    },
                },
                vendorInvoiceItems: { select: { invoiceQuantity: true, gateReceivedQty: true, invoice: { select: { status: true } } } },
                jobProcesses: {
                    select: {
                        processName: true, status: true,
                        completedQuantity: true, rejectedQuantity: true, processSequence: true,
                    },
                },
            },
        });

        // ── 3. Customer demand (active orders) ────────────────────────────────
        const customerOrderItems = await this.prisma.customerOrderItem.findMany({
            where: { order: { organizationId: orgId, status: CustomerOrderStatus.active }, pendingQty: { gt: 0 } },
            select: { partNumber: true, pendingQty: true },
        });
        const customerDemandMap = new Map<string, number>();
        for (const item of customerOrderItems) {
            customerDemandMap.set(item.partNumber, (customerDemandMap.get(item.partNumber) || 0) + item.pendingQty);
        }

        // ── 4. PO items this month (qty ordered this month) ───────────────────
        const poItemsThisMonth = await this.prisma.pOItem.findMany({
            where: {
                po: {
                    organizationId: orgId,
                    status: { not: 'draft' as any },
                    createdAt: { gte: monthStart, lte: monthEnd },
                },
            },
            select: { partNumber: true, quantity: true },
        });
        const poMonthMap = new Map<string, number>();
        for (const item of poItemsThisMonth) {
            if (item.partNumber) {
                poMonthMap.set(item.partNumber, (poMonthMap.get(item.partNumber) || 0) + item.quantity);
            }
        }

        // ── 4b. GRN accepted qty per part + PO pending per part ──────────────
        const globalGrnItems = await this.prisma.supplierGRNItem.findMany({
            where: { grn: { organizationId: orgId } },
            select: { partNumber: true, receivedQty: true, rejectedQty: true },
        });
        const globalGrnAcceptedMap = new Map<string, number>();
        for (const gi of globalGrnItems) {
            const accepted = gi.receivedQty - gi.rejectedQty;
            globalGrnAcceptedMap.set(gi.partNumber, (globalGrnAcceptedMap.get(gi.partNumber) || 0) + accepted);
        }
        // Total challan dispatched per part (all challans)
        const globalChallanItems = await this.prisma.challanItem.findMany({
            where: { challan: { vendor: { organizationId: orgId }, status: { notIn: ['rejected'] as any } } },
            select: { partNumber: true, quantityIssued: true },
        });
        const globalChallanDispMap = new Map<string, number>();
        for (const ci of globalChallanItems) {
            globalChallanDispMap.set(ci.partNumber, (globalChallanDispMap.get(ci.partNumber) || 0) + ci.quantityIssued);
        }
        // PO pending per part
        const allPoItems = await this.prisma.pOItem.findMany({
            where: { po: { organizationId: orgId, status: { in: ['approved', 'in_progress'] as any } } },
            select: { partNumber: true, quantity: true, grnItems: { select: { receivedQty: true } } },
        });
        const globalPoPendingMap = new Map<string, number>();
        for (const pi of allPoItems) {
            const received = pi.grnItems.reduce((s: number, g: any) => s + g.receivedQty, 0);
            globalPoPendingMap.set(pi.partNumber, (globalPoPendingMap.get(pi.partNumber) || 0) + Math.max(0, pi.quantity - received));
        }

        // ── 5. Ledger balance per vendor+part ─────────────────────────────────
        const ledgerEntries = await this.prisma.vendorMaterialLedger.findMany({
            where: { organizationId: orgId },
            distinct: ['vendorId', 'partNumber'],
            orderBy: [{ vendorId: 'asc' }, { partNumber: 'asc' }, { createdAt: 'desc' }],
            select: {
                vendorId: true, partNumber: true, balanceAfter: true,
                vendor: { select: { id: true, companyName: true, vendorCode: true } },
            },
        });
        const ledgerBalanceMap = new Map<string, { vendorId: string; vendorName: string; vendorCode: string; balance: number }>();
        for (const entry of ledgerEntries) {
            ledgerBalanceMap.set(`${entry.vendorId}::${entry.partNumber}`, {
                vendorId: entry.vendorId,
                vendorName: entry.vendor.companyName,
                vendorCode: entry.vendor.vendorCode,
                balance: entry.balanceAfter,
            });
        }

        // ── 6. Aggregate by partNumber ────────────────────────────────────────
        interface PartAgg {
            totalProcured: number;
            totalDispatchedBack: number;
            totalRejected: number;
            totalCompleted: number;
            lastChallanDate: Date | null;
            vendorData: Map<string, {
                vendorId: string; vendorName: string; vendorCode: string;
                issued: number; dispatched: number; completed: number; rejected: number;
                latestProcessName: string | null;
                opQtySent: Map<number, number>;       // sequenceNumber -> qty sent
                opQtyReceived: Map<number, number>;   // sequenceNumber -> qty completed
            }>;
        }

        const partAggMap = new Map<string, PartAgg>();

        for (const ci of challanItems) {
            const pn = ci.partNumber;
            const vId = ci.challan.vendorId;
            if (!partAggMap.has(pn)) {
                partAggMap.set(pn, {
                    totalProcured: 0, totalDispatchedBack: 0, totalRejected: 0, totalCompleted: 0,
                    lastChallanDate: null, vendorData: new Map(),
                });
            }
            const agg = partAggMap.get(pn)!;
            // Only count gate-verified qty from gate_approved / approved / paid invoices
            const dispatched = (ci.vendorInvoiceItems as any[])
                .filter(inv => ['gate_approved', 'approved', 'paid'].includes(inv.invoice?.status))
                .reduce((s: number, inv: any) => s + (inv.gateReceivedQty ?? inv.invoiceQuantity), 0);
            const rejected = ci.jobProcesses.reduce((s, jp) => s + jp.rejectedQuantity, 0);
            const completed = ci.jobProcesses.reduce((s, jp) => s + jp.completedQuantity, 0);

            agg.totalProcured += ci.quantityIssued;
            agg.totalDispatchedBack += dispatched;
            agg.totalRejected += rejected;
            agg.totalCompleted += completed;
            const cd = ci.challan.challanDate;
            if (!agg.lastChallanDate || cd > agg.lastChallanDate) agg.lastChallanDate = cd;

            if (!agg.vendorData.has(vId)) {
                agg.vendorData.set(vId, {
                    vendorId: vId,
                    vendorName: ci.challan.vendor.companyName,
                    vendorCode: ci.challan.vendor.vendorCode,
                    issued: 0, dispatched: 0, completed: 0, rejected: 0,
                    latestProcessName: null,
                    opQtySent: new Map(), opQtyReceived: new Map(),
                });
            }
            const vd = agg.vendorData.get(vId)!;
            vd.issued += ci.quantityIssued;
            vd.dispatched += dispatched;
            vd.rejected += rejected;
            vd.completed += completed;

            for (const jp of ci.jobProcesses) {
                const seq = jp.processSequence;
                // qty "sent" for this op = the challan item quantity (material went to this vendor for this process)
                vd.opQtySent.set(seq, (vd.opQtySent.get(seq) || 0) + ci.quantityIssued);
                vd.opQtyReceived.set(seq, (vd.opQtyReceived.get(seq) || 0) + jp.completedQuantity);
                if ((jp.status === 'in_progress' || jp.status === 'pending') && !vd.latestProcessName) {
                    vd.latestProcessName = jp.processName || 'Processing';
                }
            }
        }

        // ── 7. Build result rows ──────────────────────────────────────────────
        const rows: GlobalStockRow[] = [];

        for (const [partNumber, agg] of partAggMap) {
            const master = partMasterMap.get(partNumber);
            if (endCustomerId && master?.endCustomerId !== endCustomerId) continue;
            if (search) {
                const s = search.toLowerCase();
                const matches =
                    partNumber.toLowerCase().includes(s) ||
                    (master?.partName || '').toLowerCase().includes(s) ||
                    (master?.endCustomerName || '').toLowerCase().includes(s) ||
                    (master?.supplierName || '').toLowerCase().includes(s);
                if (!matches) continue;
            }

            // Vendor breakdown
            const vendorBreakdown: VendorStockBreakdown[] = [];
            for (const [vId, vd] of agg.vendorData) {
                const ledgerKey = `${vId}::${partNumber}`;
                const ledgerBalance = ledgerBalanceMap.get(ledgerKey)?.balance;
                const balance = ledgerBalance !== undefined ? ledgerBalance : Math.max(0, vd.issued - vd.dispatched);
                const wip = Math.max(0, vd.issued - vd.completed - vd.rejected - vd.dispatched);
                if (balance > 0 || wip > 0) {
                    vendorBreakdown.push({
                        vendorId: vId, vendorName: vd.vendorName, vendorCode: vd.vendorCode,
                        balance, currentStage: vd.latestProcessName, wip,
                    });
                }
            }

            // Per-operation data (join PartOperations with actual challan job process data)
            const operations: OperationStockData[] = (master?.operations || []).map(op => {
                let qtySent = 0, qtyReceived = 0;
                // Sum across all vendors for this sequence
                for (const vd of agg.vendorData.values()) {
                    qtySent += vd.opQtySent.get(op.sequenceNumber) || 0;
                    qtyReceived += vd.opQtyReceived.get(op.sequenceNumber) || 0;
                }
                // Determine assigned vendor name from vendor breakdown (vendor that has work at this op)
                let assignedTo = op.executionType === 'inhouse' ? 'In-house' : 'Outsourced';
                for (const vd of agg.vendorData.values()) {
                    if ((vd.opQtySent.get(op.sequenceNumber) || 0) > 0) {
                        assignedTo = vd.vendorName;
                        break;
                    }
                }
                return {
                    sequenceNumber: op.sequenceNumber,
                    operationName: op.operationName,
                    executionType: op.executionType as 'inhouse' | 'outsourced',
                    assignedTo,
                    vendorId: null,
                    qtySent,
                    qtyReceived,
                    qtyInProgress: Math.max(0, qtySent - qtyReceived),
                };
            });

            const balanceAtVendors = Math.max(0, agg.totalProcured - agg.totalDispatchedBack);
            const readyForDispatch = Math.max(0, agg.totalCompleted - agg.totalDispatchedBack - agg.totalRejected);
            const dispatchTarget = master?.dispatchTarget || 0;
            const customerRequiredQty = customerDemandMap.get(partNumber) || 0;
            const qtyOrderedThisMonth = poMonthMap.get(partNumber) || 0;

            // Priority auto-calculation
            let priority: 'urgent' | 'at_risk' | 'on_track' | 'ok' = 'ok';
            const daysSinceLastChallan = agg.lastChallanDate
                ? Math.floor((now.getTime() - agg.lastChallanDate.getTime()) / 86400000) : 999;
            if (
                (dispatchTarget > 0 && readyForDispatch < dispatchTarget * 0.5) ||
                (customerRequiredQty > 0 && balanceAtVendors < customerRequiredQty * 0.2)
            ) {
                priority = 'urgent';
            } else if (daysSinceLastChallan > 7 && balanceAtVendors > 0) {
                priority = 'at_risk';
            } else if (dispatchTarget > 0 && readyForDispatch >= dispatchTarget) {
                priority = 'on_track';
            }

            const receivedFromSupplier = globalGrnAcceptedMap.get(partNumber) || 0;
            const totalChallanDispatched = globalChallanDispMap.get(partNumber) || 0;
            const storeBalance = Math.max(0, receivedFromSupplier - totalChallanDispatched);
            const pendingFromSupplier = globalPoPendingMap.get(partNumber) || 0;

            rows.push({
                srNo: 0, partNumber,
                partName: master?.partName || '',
                endCustomer: master?.endCustomerName || null,
                materialType: master?.materialType || null,
                supplierName: master?.supplierName || null,
                supplierId: master?.supplierId || null,
                customerRequiredQty,
                qtyOrderedThisMonth,
                qtyReceivedTillNow: agg.totalDispatchedBack,
                totalProcured: agg.totalProcured,
                totalDispatchedBack: agg.totalDispatchedBack,
                balanceAtVendors,
                totalRejected: agg.totalRejected,
                readyForDispatch,
                dispatchTarget,
                receivedFromSupplier,
                storeBalance,
                pendingFromSupplier,
                operations,
                vendorBreakdown,
                lastChallanDate: agg.lastChallanDate,
                priority,
            });
        }

        // Sort: urgent first, then endCustomer, then partNumber
        const priorityOrder = { urgent: 0, at_risk: 1, on_track: 2, ok: 3 };
        rows.sort((a, b) => {
            const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pd !== 0) return pd;
            const ec = (a.endCustomer || '').localeCompare(b.endCustomer || '');
            if (ec !== 0) return ec;
            return a.partNumber.localeCompare(b.partNumber);
        });
        rows.forEach((r, i) => (r.srNo = i + 1));

        return {
            rows,
            totals: {
                customerRequiredQty: rows.reduce((s, r) => s + r.customerRequiredQty, 0),
                qtyOrderedThisMonth: rows.reduce((s, r) => s + r.qtyOrderedThisMonth, 0),
                totalProcured: rows.reduce((s, r) => s + r.totalProcured, 0),
                totalDispatchedBack: rows.reduce((s, r) => s + r.totalDispatchedBack, 0),
                balanceAtVendors: rows.reduce((s, r) => s + r.balanceAtVendors, 0),
                totalRejected: rows.reduce((s, r) => s + r.totalRejected, 0),
                readyForDispatch: rows.reduce((s, r) => s + r.readyForDispatch, 0),
                receivedFromSupplier: rows.reduce((s, r) => s + r.receivedFromSupplier, 0),
                storeBalance: rows.reduce((s, r) => s + r.storeBalance, 0),
                pendingFromSupplier: rows.reduce((s, r) => s + r.pendingFromSupplier, 0),
            },
        };
    }
}
