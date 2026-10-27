import { Injectable, Logger } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
import { PrismaService } from '../../prisma/prisma.service';

// ── Detailed sub-types ─────────────────────────────────────────────────────────

export interface ChallanItem { partNumber: string; partName: string; qty: number; operation?: string; }
export interface ChallanDetail {
    id: string;
    challanNumber: string; vendorName: string; vendorCode: string; vendorId: string;
    customerId: string;
    daysOut: number; isOverdue: boolean; items: ChallanItem[];
}
export interface InvoiceDetail {
    invoiceNumber: string; vendorName: string; amount: number; status: string; itemCount: number;
}
export interface PODetail {
    id: string; poNumber: string; vendorName: string; vendorId: string; amount: number; itemCount: number;
}
export interface JobDetail { partNumber: string; partName: string; qty: number; vendorName: string; status: string; }

export interface AtRiskPart {
    partNumber: string;
    partName: string;
    target: number;
    dispatched: number;
    wip: number;
    balance: number;
    riskLevel: 'critical' | 'warning'; // critical = >50% target still pending; warning = >25%
}

export interface LineStatusSummary {
    customerId: string;
    lineName: string;
    month: number;
    year: number;
    totalTarget: number;
    totalDispatched: number;
    totalWip: number;
    totalBalance: number;
    atRiskParts: AtRiskPart[];
}

export interface OrgSnapshot {
    orgName: string;
    userRole: string;
    snapshotTime: string;

    // Catalogue — includes IDs for agentic actions
    parts: Array<{ partNumber: string; description: string; capacity: number; unit: string }>;
    customers: Array<{ id: string; name: string; code: string }>;
    vendors: Array<{ id: string; name: string; code: string }>;

    // Rich operational detail
    openChallans: ChallanDetail[];
    pendingInvoices: InvoiceDetail[];
    pendingPOs: PODetail[];
    recentJobs: JobDetail[];
    dispatchReady: Array<any>;

    // Aggregate stats
    challanStats: { issued: number; closed: number };
    overdueChallans: number;
    pendingApprovals: number;
    approvedPOValue: number;
    draftPOs: number;
    jobsToday: number;

    // Line-wise deadline intelligence (execs only)
    lineStatus: LineStatusSummary[];

    // Job pipeline counts by ProcessStatus stage
    jobPipeline: { pending: number; in_progress: number; completed: number; rejected: number };
    stuckJobs: Array<{ partNumber: string; vendorName: string; challanNumber: string; status: string; daysSinceUpdate: number }>;

    // PO pipeline counts by status (execs only)
    posByStatus: { draft: number; pending_approval: number; approved: number; in_progress: number };

    // Customer order pipeline
    customerOrderPipeline: { active: number; on_hold: number; completed: number };

    // Quality & material receipt signals
    openNcrs: number;
    pendingInspections: number;

    roleContext: string;
    contextString: string;
}

interface CacheEntry { snapshot: OrgSnapshot; expiresAt: number; }

const VENDOR_ROLES = new Set(['vendor', 'vendor_owner', 'vendor_ppc', 'vendor_supervisor', 'vendor_user']);
const EXEC_ROLES = new Set(['director', 'gm', 'executive', 'admin', 'plant_head']);
const PPC_ROLES = new Set(['ppc_manager', 'production_manager']);
const STORE_ROLES = new Set(['store_keeper']);

@Injectable()
export class AiContextService {
    private readonly logger = new Logger(AiContextService.name);
    private readonly cache = new Map<string, CacheEntry>();
    private readonly TTL_MS = 2 * 60 * 1000; // 2 minutes — kept short for real-time accuracy

    constructor(
        private readonly jobsService: JobsService,
        private readonly prisma: PrismaService,
    ) { }

    async getSnapshot(user: any): Promise<OrgSnapshot> {
        const cacheKey = `${user.organizationId ?? user.vendorId}:${user.role}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt) return cached.snapshot;

        const snapshot = VENDOR_ROLES.has(user.role)
            ? await this.buildVendorSnapshot(user)
            : await this.buildOrgSnapshot(user);

        this.cache.set(cacheKey, { snapshot, expiresAt: Date.now() + this.TTL_MS });
        this.logger.log(`Snapshot [${user.role}@${user.organizationId ?? user.vendorId}] — ${snapshot.openChallans.length} challans, ${snapshot.parts.length} parts, ${snapshot.customers.length} customers`);
        return snapshot;
    }

    invalidateCache(orgId: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(orgId)) this.cache.delete(key);
        }
    }

    // ── Vendor-specific snapshot (no customer names, only their own data) ──────
    private async buildVendorSnapshot(user: any): Promise<OrgSnapshot> {
        const vendorId = user.vendorId;
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

        if (!vendorId) throw new Error('vendorId missing on vendor user');

        const [vendorRow, rawChallans, rawInvoices, rawPOs] = await Promise.allSettled([
            this.prisma.vendor.findUnique({ where: { id: vendorId }, select: { companyName: true, vendorCode: true } }),

            // Open challans for this vendor
            this.prisma.deliveryChallan.findMany({
                where: { vendorId, status: 'issued' },
                select: {
                    id: true, challanNumber: true, challanDate: true, customerId: true,
                    items: {
                        select: {
                            id: true, partNumber: true, partDescription: true, quantityIssued: true,
                            jobProcesses: {
                                select: { id: true, status: true, completedQuantity: true, processName: true },
                                orderBy: { processSequence: 'asc' },
                            },
                        },
                    },
                },
                orderBy: { challanDate: 'asc' },
                take: 30,
            }),

            // Their invoices
            this.prisma.vendorInvoice.findMany({
                where: { vendorId, status: { in: ['draft', 'submitted'] } },
                select: {
                    invoiceNumber: true, totalAmount: true, status: true,
                    _count: { select: { items: true } },
                },
                take: 20,
            }),

            // Their POs
            this.prisma.purchaseOrder.findMany({
                where: { vendorId, status: { in: ['approved', 'in_progress', 'pending_approval'] } },
                select: {
                    id: true, poNumber: true, totalAmount: true, status: true,
                    items: {
                        select: { partNumber: true, partDescription: true, quantity: true, ratePerPiece: true },
                    },
                },
                take: 20,
            }),
        ]);

        const vendorName = vendorRow.status === 'fulfilled' ? vendorRow.value?.companyName ?? 'Your Company' : 'Your Company';

        const openChallans: ChallanDetail[] = [];
        if (rawChallans.status === 'fulfilled') {
            for (const c of rawChallans.value as any[]) {
                const daysOut = Math.floor((now.getTime() - new Date(c.challanDate).getTime()) / 86400000);
                openChallans.push({
                    id: c.id,
                    challanNumber: c.challanNumber,
                    vendorName, vendorCode: '', vendorId,
                    customerId: c.customerId,
                    daysOut, isOverdue: daysOut > 7,
                    items: c.items.map((i: any) => ({
                        partNumber: i.partNumber,
                        partName: i.partDescription || i.partNumber,
                        qty: i.quantityIssued,
                        operation: i.jobProcesses?.map((p: any) => `${p.processName || 'Process'}:${p.status}(${p.completedQuantity ?? 0})`).join(', '),
                    })),
                });
            }
        }

        // Parts from their POs (vendor sees their own parts only)
        const partMap = new Map<string, any>();
        if (rawPOs.status === 'fulfilled') {
            for (const po of rawPOs.value as any[]) {
                for (const item of po.items) {
                    if (!partMap.has(item.partNumber)) {
                        partMap.set(item.partNumber, {
                            partNumber: item.partNumber,
                            description: item.partDescription || item.partNumber,
                            capacity: 0, unit: 'NOS',
                        });
                    }
                }
            }
        }

        const pendingInvoices: InvoiceDetail[] = rawInvoices.status === 'fulfilled'
            ? rawInvoices.value.map((i: any) => ({
                invoiceNumber: i.invoiceNumber,
                vendorName,
                amount: Number(i.totalAmount ?? 0),
                status: i.status,
                itemCount: i._count.items,
            })) : [];

        const pendingPOs: PODetail[] = rawPOs.status === 'fulfilled'
            ? rawPOs.value.map((p: any) => ({
                id: p.id,
                poNumber: p.poNumber,
                vendorName,
                vendorId,
                amount: Number(p.totalAmount ?? 0),
                itemCount: p.items.length,
            })) : [];

        const parts = Array.from(partMap.values());
        const contextString = this.buildVendorContextString({
            vendorName, openChallans, pendingInvoices, pendingPOs, parts,
            snapshotTime: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });

        return {
            orgName: vendorName, userRole: user.role, snapshotTime: now.toISOString(),
            parts, customers: [], vendors: [],
            openChallans, pendingInvoices, pendingPOs, recentJobs: [],
            dispatchReady: [],
            challanStats: { issued: openChallans.length, closed: 0 },
            overdueChallans: openChallans.filter(c => c.isOverdue).length,
            pendingApprovals: 0, approvedPOValue: 0, draftPOs: 0, jobsToday: 0,
            lineStatus: [],
            jobPipeline: { pending: 0, in_progress: 0, completed: 0, rejected: 0 },
            stuckJobs: [],
            posByStatus: { draft: 0, pending_approval: 0, approved: 0, in_progress: 0 },
            customerOrderPipeline: { active: 0, on_hold: 0, completed: 0 },
            openNcrs: 0, pendingInspections: 0,
            roleContext: '', contextString,
        };
    }

    // ── Org-level snapshot (exec / PPC / store) ──────────────────────────────
    private async buildOrgSnapshot(user: any): Promise<OrgSnapshot> {
        const orgId = user.organizationId;
        const role = user.role;
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

        const [orgRow, rawCustomers, rawVendors, trayParts, challanParts, poParts] = await Promise.allSettled([
            this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),

            this.prisma.customer.findMany({
                where: { organizationId: orgId },
                select: { id: true, companyName: true, code: true },
                orderBy: { companyName: 'asc' },
            }),

            this.prisma.vendor.findMany({
                where: {
                    isActive: true, status: 'approved',
                    OR: [{ organizationId: orgId }, { customer: { organizationId: orgId } }],
                },
                select: { id: true, companyName: true, vendorCode: true },
                take: 100,
            }),

            // Parts source 1: tray config (master catalogue)
            this.prisma.trayConfiguration.findMany({
                where: { organizationId: orgId },
                select: { partNumber: true, description: true, capacity: true, unit: true },
                orderBy: { partNumber: 'asc' },
                take: 300,
            }),

            // Parts source 2: challan items
            this.prisma.challanItem.findMany({
                where: { challan: { customer: { organizationId: orgId } } },
                select: { partNumber: true },
                distinct: ['partNumber'],
                take: 300,
            }),

            // Parts source 3: PO items
            this.prisma.pOItem.findMany({
                where: { po: { organizationId: orgId } },
                select: { partNumber: true, partDescription: true },
                distinct: ['partNumber'],
                take: 200,
            }).catch(() => [] as any[]),
        ]);

        const orgName = orgRow.status === 'fulfilled' ? orgRow.value?.name ?? 'Your Organisation' : 'Your Organisation';

        const customers = rawCustomers.status === 'fulfilled'
            ? rawCustomers.value.map((c: any) => ({ id: c.id, name: c.companyName, code: c.code || '' }))
            : [];

        const vendors = rawVendors.status === 'fulfilled'
            ? rawVendors.value.map((v: any) => ({ id: v.id, name: v.companyName, code: v.vendorCode || '' }))
            : [];

        // Merge parts from all three sources
        const partMap = new Map<string, any>();

        if (trayParts.status === 'fulfilled') {
            for (const p of trayParts.value as any[]) {
                partMap.set(p.partNumber, { partNumber: p.partNumber, description: p.description || p.partNumber, capacity: p.capacity || 0, unit: p.unit || 'NOS' });
            }
        }
        if (challanParts.status === 'fulfilled') {
            for (const p of challanParts.value as any[]) {
                if (!partMap.has(p.partNumber)) {
                    partMap.set(p.partNumber, { partNumber: p.partNumber, description: p.partNumber, capacity: 0, unit: 'NOS' });
                }
            }
        }
        if (poParts.status === 'fulfilled') {
            for (const p of poParts.value as any[]) {
                if (!partMap.has(p.partNumber)) {
                    partMap.set(p.partNumber, { partNumber: p.partNumber, description: p.partDescription || p.partNumber, capacity: 0, unit: 'NOS' });
                }
            }
        }
        const parts = Array.from(partMap.values());

        this.logger.log(`[${orgId}] Catalogue: ${customers.length} customers, ${vendors.length} vendors, ${parts.length} parts`);

        // ── Open challans ────────────────────────────────────────────────────
        let openChallans: ChallanDetail[] = [];
        let challanStats = { issued: 0, closed: 0 };
        let overdueChallans = 0;
        try {
            const rawChallans = await this.prisma.deliveryChallan.findMany({
                where: { customer: { organizationId: orgId }, status: 'issued' },
                select: {
                    id: true, challanNumber: true, challanDate: true, customerId: true,
                    vendor: { select: { id: true, companyName: true, vendorCode: true } },
                    items: {
                        select: {
                            quantityIssued: true, partNumber: true, partDescription: true,
                            jobProcesses: { select: { processName: true }, take: 1 },
                        },
                    },
                },
                orderBy: { challanDate: 'asc' }, take: 30,
            });

            openChallans = rawChallans.map((c: any) => {
                const daysOut = Math.floor((now.getTime() - new Date(c.challanDate).getTime()) / 86400000);
                return {
                    id: c.id,
                    challanNumber: c.challanNumber,
                    vendorName: c.vendor.companyName,
                    vendorCode: c.vendor.vendorCode,
                    vendorId: c.vendor.id,
                    customerId: c.customerId,
                    daysOut, isOverdue: daysOut > 7,
                    items: c.items.map((i: any) => ({
                        partNumber: i.partNumber,
                        partName: i.partDescription || i.partNumber,
                        qty: i.quantityIssued,
                        operation: i.jobProcesses?.[0]?.processName,
                    })),
                };
            });

            challanStats.issued = openChallans.length;
            overdueChallans = openChallans.filter(c => c.isOverdue).length;
            challanStats.closed = await this.prisma.deliveryChallan.count({
                where: { customer: { organizationId: orgId }, status: 'received' },
            });
        } catch (e) { this.logger.warn('Challan fetch failed: ' + e); }

        // ── Pending invoices ─────────────────────────────────────────────────
        let pendingInvoices: InvoiceDetail[] = [];
        try {
            const rawInvoices = await this.prisma.vendorInvoice.findMany({
                where: { customer: { organizationId: orgId }, status: { in: ['submitted', 'draft'] } },
                select: {
                    invoiceNumber: true, totalAmount: true, status: true,
                    vendor: { select: { companyName: true } },
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: 'desc' }, take: 20,
            });
            pendingInvoices = rawInvoices.map((i: any) => ({
                invoiceNumber: i.invoiceNumber, vendorName: i.vendor.companyName,
                amount: Number(i.totalAmount ?? 0), status: i.status, itemCount: i._count.items,
            }));
        } catch (e) { this.logger.warn('Invoice fetch failed: ' + e); }

        // ── Pending POs ──────────────────────────────────────────────────────
        let pendingPOs: PODetail[] = [];
        let pendingApprovals = 0, approvedPOValue = 0, draftPOs = 0;
        try {
            const [rawPOs, approvedAgg, draftCount] = await Promise.all([
                this.prisma.purchaseOrder.findMany({
                    where: { organizationId: orgId, status: 'pending_approval' },
                    select: {
                        id: true, poNumber: true, totalAmount: true,
                        vendor: { select: { id: true, companyName: true } },
                        _count: { select: { items: true } },
                    },
                    orderBy: { createdAt: 'desc' }, take: 15,
                }),
                this.prisma.purchaseOrder.aggregate({
                    where: { organizationId: orgId, status: { in: ['approved', 'in_progress'] } },
                    _sum: { totalAmount: true },
                }),
                this.prisma.purchaseOrder.count({ where: { organizationId: orgId, status: 'draft' } }),
            ]);

            pendingPOs = rawPOs.map((p: any) => ({
                id: p.id, poNumber: p.poNumber,
                vendorName: p.vendor.companyName, vendorId: p.vendor.id,
                amount: Number(p.totalAmount ?? 0), itemCount: p._count.items,
            }));
            pendingApprovals = pendingPOs.length;
            approvedPOValue = Number(approvedAgg._sum.totalAmount ?? 0);
            draftPOs = draftCount;
        } catch (e) { this.logger.warn('PO fetch failed: ' + e); }

        // ── Jobs ─────────────────────────────────────────────────────────────
        let recentJobs: JobDetail[] = [];
        let jobsToday = 0;
        try {
            const [rawJobs, todayCount] = await Promise.all([
                this.prisma.jobProcess.findMany({
                    where: {
                        status: { in: ['completed', 'in_progress', 'rejected'] },
                        challanItem: { challan: { customer: { organizationId: orgId } } },
                    },
                    select: {
                        status: true,
                        challanItem: {
                            select: {
                                partNumber: true, partDescription: true, quantityIssued: true,
                                challan: { select: { vendor: { select: { companyName: true } } } },
                            },
                        },
                    },
                    orderBy: { updatedAt: 'desc' }, take: 20,
                }),
                this.prisma.jobProcess.count({
                    where: {
                        status: 'completed', completedAt: { gte: todayStart },
                        challanItem: { challan: { customer: { organizationId: orgId } } },
                    },
                }),
            ]);
            recentJobs = rawJobs.map((j: any) => ({
                partNumber: j.challanItem?.partNumber || '',
                partName: j.challanItem?.partDescription || j.challanItem?.partNumber || '',
                qty: j.challanItem?.quantityIssued || 0,
                vendorName: j.challanItem?.challan?.vendor?.companyName || '',
                status: j.status,
            }));
            jobsToday = todayCount;
        } catch (e) { this.logger.warn('Jobs fetch failed: ' + e); }

        // ── Dispatch ready ───────────────────────────────────────────────────
        let dispatchReady: any[] = [];
        try {
            const dispatchRes = await this.jobsService.getReadyForDispatchByPart(undefined, undefined, undefined);
            dispatchReady = (dispatchRes as any).data || [];
        } catch { }

        // ── Job pipeline + quality signals (exec / PPC) ──────────────────────
        let jobPipeline = { pending: 0, in_progress: 0, completed: 0, rejected: 0 };
        let stuckJobs: OrgSnapshot['stuckJobs'] = [];
        let posByStatus = { draft: 0, pending_approval: 0, approved: 0, in_progress: 0 };
        let customerOrderPipeline = { active: 0, on_hold: 0, completed: 0 };
        let openNcrs = 0;
        let pendingInspections = 0;

        if (EXEC_ROLES.has(role) || PPC_ROLES.has(role)) {
            try {
                const stuckCutoff = new Date(now.getTime() - 5 * 86400000); // 5 days ago

                const [pipelineGroups, stuckJobRows, poGroups, orderGroups, ncrCount, receiptCount] = await Promise.allSettled([
                    this.prisma.jobProcess.groupBy({
                        by: ['status'],
                        where: { challanItem: { challan: { customer: { organizationId: orgId } } } },
                        _count: { status: true },
                    }),
                    this.prisma.jobProcess.findMany({
                        where: {
                            status: { in: ['pending', 'in_progress'] },
                            updatedAt: { lte: stuckCutoff },
                            challanItem: { challan: { customer: { organizationId: orgId }, status: 'issued' } },
                        },
                        select: {
                            status: true, updatedAt: true,
                            challanItem: {
                                select: {
                                    partNumber: true,
                                    challan: { select: { challanNumber: true, vendor: { select: { companyName: true } } } },
                                },
                            },
                        },
                        orderBy: { updatedAt: 'asc' },
                        take: 10,
                    }),
                    this.prisma.purchaseOrder.groupBy({
                        by: ['status'],
                        where: { organizationId: orgId, status: { in: ['draft', 'pending_approval', 'approved', 'in_progress'] } },
                        _count: { status: true },
                    }),
                    this.prisma.customerOrder.groupBy({
                        by: ['status'],
                        where: { organizationId: orgId, status: { in: ['active', 'on_hold', 'completed'] } },
                        _count: { status: true },
                    }).catch(() => []),
                    this.prisma.nonConformanceReport.count({ where: { organizationId: orgId, status: 'open' } }).catch(() => 0),
                    this.prisma.materialReceipt.count({ where: { organizationId: orgId, status: 'pending_inspection' } }).catch(() => 0),
                ]);

                if (pipelineGroups.status === 'fulfilled') {
                    for (const g of pipelineGroups.value) {
                        const k = g.status as keyof typeof jobPipeline;
                        if (k in jobPipeline) jobPipeline[k] = g._count.status;
                    }
                }
                if (stuckJobRows.status === 'fulfilled') {
                    stuckJobs = (stuckJobRows.value as any[]).map(j => ({
                        partNumber: j.challanItem.partNumber,
                        vendorName: j.challanItem.challan.vendor?.companyName ?? 'Unknown',
                        challanNumber: j.challanItem.challan.challanNumber,
                        status: j.status,
                        daysSinceUpdate: Math.floor((now.getTime() - new Date(j.updatedAt).getTime()) / 86400000),
                    }));
                }
                if (poGroups.status === 'fulfilled') {
                    for (const g of poGroups.value) {
                        const k = g.status as keyof typeof posByStatus;
                        if (k in posByStatus) posByStatus[k] = g._count.status;
                    }
                }
                if (orderGroups.status === 'fulfilled') {
                    for (const g of orderGroups.value as any[]) {
                        const k = g.status as keyof typeof customerOrderPipeline;
                        if (k in customerOrderPipeline) customerOrderPipeline[k] = g._count.status;
                    }
                }
                openNcrs = ncrCount.status === 'fulfilled' ? (ncrCount.value as number) : 0;
                pendingInspections = receiptCount.status === 'fulfilled' ? (receiptCount.value as number) : 0;
            } catch (e) { this.logger.warn('Pipeline fetch failed: ' + e); }
        }

        // ── Line deadline status (exec-only — most critical intel) ────────────
        let lineStatus: LineStatusSummary[] = [];
        if (EXEC_ROLES.has(role) || PPC_ROLES.has(role)) {
            lineStatus = await this.buildLineStatus(orgId, customers, openChallans, now);
        }

        const contextString = this.buildOrgContextString({
            orgName, role, parts, customers, vendors,
            openChallans, pendingInvoices, pendingPOs, recentJobs,
            dispatchReady, challanStats, overdueChallans,
            pendingApprovals, approvedPOValue, draftPOs, jobsToday,
            lineStatus, jobPipeline, stuckJobs, posByStatus, customerOrderPipeline, openNcrs, pendingInspections,
            snapshotTime: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        });

        return {
            orgName, userRole: role, snapshotTime: now.toISOString(),
            parts, customers, vendors,
            openChallans, pendingInvoices, pendingPOs, recentJobs,
            dispatchReady, challanStats, overdueChallans,
            pendingApprovals, approvedPOValue, draftPOs, jobsToday,
            lineStatus, jobPipeline, stuckJobs, posByStatus, customerOrderPipeline, openNcrs, pendingInspections,
            roleContext: '', contextString,
        };
    }

    // ── Line deadline status builder ─────────────────────────────────────────
    private async buildLineStatus(
        orgId: string,
        customers: Array<{ id: string; name: string; code: string }>,
        openChallans: ChallanDetail[],
        now: Date,
    ): Promise<LineStatusSummary[]> {
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        const daysInMonth = new Date(year, month, 0).getDate();
        const dayOfMonth = now.getDate();
        const daysLeft = daysInMonth - dayOfMonth;

        try {
            // Fetch stored targets for this month
            const deadlines = await this.prisma.lineDeadline.findMany({
                where: { organizationId: orgId, month, year },
                select: {
                    customerId: true, partNumber: true,
                    monthlyTarget: true, readyForDispatch: true,
                },
            });

            // Fetch dispatched qty this month per customer+part
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
            const dispatchItems = await this.prisma.dispatchItem.findMany({
                where: {
                    dispatchPlan: {
                        customer: { organizationId: orgId },
                        plannedDate: { gte: startOfMonth, lte: endOfMonth },
                    },
                },
                select: {
                    quantityDispatched: true,
                    dispatchPlan: { select: { customerId: true } },
                    challanItem: { select: { partNumber: true } },
                },
            });

            // Build dispatch map
            const dispatchMap = new Map<string, number>();
            for (const di of dispatchItems) {
                const key = `${di.dispatchPlan.customerId}__${di.challanItem.partNumber}`;
                dispatchMap.set(key, (dispatchMap.get(key) ?? 0) + di.quantityDispatched);
            }

            // Build WIP map from open challans (already fetched)
            const wipMap = new Map<string, number>();
            for (const c of openChallans) {
                for (const item of c.items) {
                    const key = `${c.customerId}__${item.partNumber}`;
                    wipMap.set(key, (wipMap.get(key) ?? 0) + item.qty);
                }
            }

            // Group deadlines by customer
            const byCustomer = new Map<string, typeof deadlines>();
            for (const d of deadlines) {
                if (!byCustomer.has(d.customerId)) byCustomer.set(d.customerId, []);
                byCustomer.get(d.customerId)!.push(d);
            }

            const result: LineStatusSummary[] = [];
            for (const customer of customers) {
                const rows = byCustomer.get(customer.id) ?? [];
                if (rows.length === 0) continue; // No targets set for this line

                let totalTarget = 0, totalDispatched = 0, totalWip = 0;
                const atRiskParts: AtRiskPart[] = [];

                for (const row of rows) {
                    const key = `${customer.id}__${row.partNumber}`;
                    const dispatched = dispatchMap.get(key) ?? 0;
                    const wip = wipMap.get(key) ?? 0;
                    const balance = Math.max(0, row.monthlyTarget - dispatched);

                    totalTarget += row.monthlyTarget;
                    totalDispatched += dispatched;
                    totalWip += wip;

                    if (row.monthlyTarget > 0 && balance > 0) {
                        const balancePct = balance / row.monthlyTarget;
                        // Critical: >50% pending with ≤10 days left, or >75% pending
                        // Warning: >25% pending with ≤15 days left
                        const isCritical = balancePct > 0.75 || (balancePct > 0.50 && daysLeft <= 10);
                        const isWarning = balancePct > 0.25 && daysLeft <= 15;
                        if (isCritical || isWarning) {
                            atRiskParts.push({
                                partNumber: row.partNumber,
                                partName: row.partNumber,
                                target: row.monthlyTarget,
                                dispatched,
                                wip,
                                balance,
                                riskLevel: isCritical ? 'critical' : 'warning',
                            });
                        }
                    }
                }

                // Sort: critical first, then by balance desc
                atRiskParts.sort((a, b) => {
                    if (a.riskLevel !== b.riskLevel) return a.riskLevel === 'critical' ? -1 : 1;
                    return b.balance - a.balance;
                });

                result.push({
                    customerId: customer.id,
                    lineName: customer.name,
                    month, year,
                    totalTarget,
                    totalDispatched,
                    totalWip,
                    totalBalance: Math.max(0, totalTarget - totalDispatched),
                    atRiskParts,
                });
            }

            // Sort lines: most at-risk first (by balance desc)
            result.sort((a, b) => b.totalBalance - a.totalBalance);
            return result;
        } catch (err: any) {
            this.logger.warn('Line status build failed: ' + err.message);
            return [];
        }
    }

    // ── Context string for vendor users ──────────────────────────────────────
    private buildVendorContextString(d: {
        vendorName: string; snapshotTime: string;
        openChallans: ChallanDetail[]; pendingInvoices: InvoiceDetail[];
        pendingPOs: PODetail[]; parts: any[];
    }): string {
        const challanBlock = d.openChallans.length === 0
            ? '  — No active challans'
            : d.openChallans.map(c =>
                `  ${c.isOverdue ? '⚠ ' : ''}${c.challanNumber} — ${c.daysOut}d at your facility${c.isOverdue ? ' OVERDUE' : ''}\n` +
                c.items.map(i => `     - ${i.qty}× ${i.partNumber} (${i.partName}) | ${i.operation || 'pending'}`).join('\n')
            ).join('\n');

        const poBlock = d.pendingPOs.length === 0
            ? '  — None active'
            : d.pendingPOs.map(p => `  ${p.poNumber} — ${p.itemCount} item(s)`).join('\n');

        const invoiceBlock = d.pendingInvoices.length === 0
            ? '  — None pending'
            : d.pendingInvoices.map(i => `  ${i.invoiceNumber} — [${i.status}]`).join('\n');

        const partsBlock = d.parts.map(p => `${p.partNumber}: ${p.description}`).join(' | ') || '—';

        return `╔══ LIVE DATA — ${d.vendorName} (Vendor) ══╗
Snapshot: ${d.snapshotTime}

── YOUR ACTIVE CHALLANS (${d.openChallans.length}) ──
${challanBlock}

── YOUR PURCHASE ORDERS (${d.pendingPOs.length}) ──
${poBlock}

── YOUR INVOICES PENDING (${d.pendingInvoices.length}) ──
${invoiceBlock}

── YOUR PARTS (${d.parts.length}) ──
  ${partsBlock.substring(0, 500)}
╚════════════════════════════════╝`;
    }

    // ── Context string for org users ─────────────────────────────────────────
    private buildOrgContextString(d: {
        orgName: string; role: string; snapshotTime: string;
        parts: any[]; customers: any[]; vendors: any[];
        openChallans: ChallanDetail[]; pendingInvoices: InvoiceDetail[];
        pendingPOs: PODetail[]; recentJobs: JobDetail[];
        dispatchReady: any[]; challanStats: any; overdueChallans: number;
        pendingApprovals: number; approvedPOValue: number; draftPOs: number;
        jobsToday: number; lineStatus: LineStatusSummary[];
        jobPipeline: OrgSnapshot['jobPipeline'];
        stuckJobs: OrgSnapshot['stuckJobs'];
        posByStatus: OrgSnapshot['posByStatus'];
        customerOrderPipeline: OrgSnapshot['customerOrderPipeline'];
        openNcrs: number; pendingInspections: number;
    }): string {
        const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
        const isStore = STORE_ROLES.has(d.role);
        const isPPC = PPC_ROLES.has(d.role);

        // Overdue challans always shown in full; on-track ones summarised when there are many.
        // This keeps the most actionable data prominent and caps token spend on large orgs.
        const overdueCh = d.openChallans.filter(c => c.isOverdue);
        const onTimeCh  = d.openChallans.filter(c => !c.isOverdue);
        const formatChallan = (c: any) =>
            `  ${c.isOverdue ? '⚠ ' : ''}${c.challanNumber} → ${c.vendorName} [id:${c.vendorId}] | ${c.daysOut}d out${c.isOverdue ? ' OVERDUE' : ''}\n` +
            c.items.map((i: any) => `     - ${i.qty}× ${i.partNumber} (${i.partName})${i.operation ? ` | ${i.operation}` : ''}`).join('\n');

        let challanBlock: string;
        if (d.openChallans.length === 0) {
            challanBlock = '  — No material currently at any vendor';
        } else {
            const overdueLines  = overdueCh.map(formatChallan);
            // Show on-time challans in full up to 8; summarise the rest
            const onTimeFull    = onTimeCh.slice(0, 8).map(formatChallan);
            const onTimeHidden  = onTimeCh.length > 8
                ? [`  … +${onTimeCh.length - 8} more on-time challan(s) — ask for details if needed`]
                : [];
            challanBlock = [...overdueLines, ...onTimeFull, ...onTimeHidden].join('\n') || '  — None';
        }

        const invoiceBlock = (isStore || isPPC)
            ? '' // Store/PPC don't need invoice details
            : (d.pendingInvoices.length === 0
                ? '  — None pending'
                : d.pendingInvoices.map(i => `  ${i.invoiceNumber} from ${i.vendorName} — ${inr(i.amount)} [${i.status}]`).join('\n'));

        const poBlock = d.pendingPOs.length === 0
            ? '  — None pending approval'
            : d.pendingPOs.map(p => `  ${p.poNumber} → ${p.vendorName} [id:${p.vendorId}] — ${inr(p.amount)} | ${p.itemCount} line(s)`).join('\n');

        const customersBlock = d.customers.map(c => `${c.name}${c.code ? ` (${c.code})` : ''} [id:${c.id}]`).join(', ') || 'None';
        const vendorsBlock = d.vendors.map(v => `${v.name}${v.code ? ` (${v.code})` : ''} [id:${v.id}]`).join(', ') || 'None';
        const partsBlock = d.parts.length === 0
            ? '  — None configured'
            : d.parts.map(p => `${p.partNumber}: ${p.description}`).join(' | ');

        const dispatchBlock = d.dispatchReady.length > 0
            ? d.dispatchReady.map((p: any) => `  ${p.partNumber} — ${p.totalQuantityReady} units ready`).join('\n')
            : '  — None ready';

        let contextStr = `╔══ LIVE DATA SNAPSHOT — ${d.orgName} ══╗
Snapshot: ${d.snapshotTime} | Role: ${d.role}

── MATERIAL AT VENDORS (${d.openChallans.length} challan${d.openChallans.length !== 1 ? 's' : ''}, ${d.overdueChallans} overdue) ──
${challanBlock}

── OEM CUSTOMERS (${d.customers.length}) ──
  ${customersBlock}

── VENDORS (${d.vendors.length}) ──
  ${vendorsBlock.substring(0, 400)}${vendorsBlock.length > 400 ? '…' : ''}

── PARTS CATALOGUE (${d.parts.length}) ──
  ${partsBlock.substring(0, 600)}${partsBlock.length > 600 ? '…' : ''}

── DISPATCH READY ──
${dispatchBlock}

── TODAY ──
  Jobs completed: ${d.jobsToday}`;

        // ── Job pipeline section (exec / PPC) ────────────────────────────────
        const isExecOrPPC = EXEC_ROLES.has(d.role) || PPC_ROLES.has(d.role);
        if (isExecOrPPC) {
            const jp = d.jobPipeline;
            const totalJobs = jp.pending + jp.in_progress + jp.completed + jp.rejected;
            const stuckLine = d.stuckJobs.length > 0
                ? `\n  ⚠ STUCK (5+ days silent): ${d.stuckJobs.map(j => `${j.partNumber} @ ${j.vendorName} (${j.daysSinceUpdate}d, ${j.challanNumber})`).join(' | ')}`
                : '\n  No stuck jobs';
            contextStr += `\n\n── JOB PIPELINE (${totalJobs} total) ──`;
            contextStr += `\n  Pending: ${jp.pending} · In Progress: ${jp.in_progress} · Completed: ${jp.completed}${jp.rejected > 0 ? ` · Rejected: ${jp.rejected}` : ''}${stuckLine}`;

            const co = d.customerOrderPipeline;
            if (co.active + co.on_hold + co.completed > 0) {
                contextStr += `\n\n── CUSTOMER ORDERS ──`;
                contextStr += `\n  Active: ${co.active} · On Hold: ${co.on_hold} · Completed: ${co.completed}`;
            }

            const pos = d.posByStatus;
            contextStr += `\n\n── PO PIPELINE ──`;
            contextStr += `\n  Approved: ${pos.approved} · Running: ${pos.in_progress} · Awaiting Approval: ${pos.pending_approval} · Draft: ${pos.draft}`;

            if (d.openNcrs > 0 || d.pendingInspections > 0) {
                contextStr += `\n\n── QUALITY & INCOMING ──`;
                contextStr += `\n  Open NCRs: ${d.openNcrs} · Pending Inspections: ${d.pendingInspections}`;
            }
        }

        if (!isStore) {
            contextStr += `\n\n── PURCHASE ORDERS PENDING APPROVAL (${d.pendingApprovals}) ──\n${poBlock}`;
            contextStr += `\n\n── FINANCIALS ──\n  Approved PO value: ${inr(d.approvedPOValue)} | Drafts: ${d.draftPOs}`;
        }

        if (!isStore && !isPPC && invoiceBlock) {
            contextStr += `\n\n── VENDOR INVOICES AWAITING APPROVAL (${d.pendingInvoices.length}) ──\n${invoiceBlock}`;
        }

        // ── LINE DEADLINE INTELLIGENCE (execs + PPC) ─────────────────────────
        if (d.lineStatus.length > 0) {
            const now = new Date();
            const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
            const criticalLines = d.lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'critical'));
            const warningLines = d.lineStatus.filter(l => l.atRiskParts.some(p => p.riskLevel === 'warning') && !criticalLines.includes(l));

            let lineBlock = `\n\n── LINE DEADLINES — ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} (${daysLeft} days left) ──`;

            for (const line of d.lineStatus) {
                const dispatchedPct = line.totalTarget > 0 ? Math.round((line.totalDispatched / line.totalTarget) * 100) : 0;
                const statusIcon = line.totalBalance === 0 ? '✅' : line.atRiskParts.some(p => p.riskLevel === 'critical') ? '🔴' : line.atRiskParts.length > 0 ? '🟡' : '🟢';
                lineBlock += `\n  ${statusIcon} ${line.lineName} — Target: ${line.totalTarget} · Dispatched: ${line.totalDispatched} (${dispatchedPct}%) · WIP: ${line.totalWip} · Balance: ${line.totalBalance}`;

                // Show at-risk part detail; skip per-part breakdown for on-track lines (saves tokens)
                if (line.atRiskParts.length > 0) {
                    lineBlock += `\n     AT RISK PARTS:`;
                    for (const p of line.atRiskParts.slice(0, 4)) {
                        const wipNote = p.wip > 0 ? ` (${p.wip} at vendor)` : ' (no WIP — not started!)';
                        lineBlock += `\n       ${p.riskLevel === 'critical' ? '🔴 CRITICAL' : '🟡 WARNING'} ${p.partNumber} · bal ${p.balance}/${p.target} dispatched ${p.dispatched}${wipNote}`;
                    }
                    if (line.atRiskParts.length > 4) {
                        lineBlock += `\n       … +${line.atRiskParts.length - 4} more at-risk parts`;
                    }
                }
                // On-track lines: summary only (no per-part row)
            }

            if (criticalLines.length > 0) {
                lineBlock += `\n\n  ⚠ ${criticalLines.length} line(s) with CRITICAL parts — immediate action needed!`;
            }

            contextStr += lineBlock;
        } else if (EXEC_ROLES.has(d.role) || PPC_ROLES.has(d.role)) {
            contextStr += `\n\n── LINE DEADLINES ──\n  No targets set for this month yet. Use the Line Deadlines module to configure.`;
        }

        contextStr += '\n╚════════════════════════════════╝';
        return contextStr;
    }
}
