import { Injectable, NotFoundException } from '@nestjs/common';
import { ChallanStatus, DispatchStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpsertLineDeadlineDto {
    customerId: string;
    partNumber: string;
    month: number;
    year: number;
    monthlyTarget?: number;
    week1Target?: number;
    week2Target?: number;
    week3Target?: number;
    week4Target?: number;
    readyForDispatch?: number;
    notes?: string;
}

export interface LineDeadlineRow {
    customerId: string;
    partNumber: string;
    partName: string;
    month: number;
    year: number;
    monthlyTarget: number;
    week1Target: number;
    week2Target: number;
    week3Target: number;
    week4Target: number;
    readyForDispatch: number;
    dispatched: number;      // auto-computed: dispatched to customer this month
    wip: number;             // auto-computed: qty currently at vendors
    balance: number;         // monthlyTarget − dispatched
    notes: string | null;
}

export interface LineGroup {
    customerId: string;
    lineName: string;
    customerCode: string;
    rows: LineDeadlineRow[];
    totals: {
        monthlyTarget: number;
        week1Target: number;
        week2Target: number;
        week3Target: number;
        week4Target: number;
        readyForDispatch: number;
        dispatched: number;
        wip: number;
        balance: number;
    };
}

@Injectable()
export class LineDeadlinesService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── GET: All lines with targets + live WIP/dispatched ──────────────────────
    async getMonthData(orgId: string, month: number, year: number): Promise<{
        month: number;
        year: number;
        lines: LineGroup[];
        grandTotals: {
            monthlyTarget: number;
            dispatched: number;
            wip: number;
            readyForDispatch: number;
            balance: number;
        };
    }> {
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

        // ── 1. All active customers for this org ─────────────────────────────
        const customers = await this.prisma.customer.findMany({
            where: { organizationId: orgId, isActive: true },
            select: { id: true, companyName: true, code: true },
            orderBy: { companyName: 'asc' },
        });

        // ── 2. Stored targets for this month ─────────────────────────────────
        const storedTargets = await this.prisma.lineDeadline.findMany({
            where: { organizationId: orgId, month, year },
        });
        const targetMap = new Map<string, typeof storedTargets[0]>();
        for (const t of storedTargets) {
            targetMap.set(`${t.customerId}__${t.partNumber}`, t);
        }

        // ── 3. Active challan items for all customers of this org (for WIP) ──
        const challanItems = await this.prisma.challanItem.findMany({
            where: {
                challan: {
                    customer: { organizationId: orgId },
                    status: { notIn: [ChallanStatus.closed, ChallanStatus.rejected] },
                },
            },
            select: {
                partNumber: true,
                partDescription: true,
                quantityIssued: true,
                challan: { select: { customerId: true } },
                jobProcesses: {
                    select: { completedQuantity: true, processSequence: true },
                    orderBy: { processSequence: 'desc' },
                    take: 1,
                },
            },
        });

        // ── 4. Dispatches TO customer this month ─────────────────────────────
        const dispatchItems = await this.prisma.dispatchItem.findMany({
            where: {
                dispatchPlan: {
                    customer: { organizationId: orgId },
                    status: { in: [DispatchStatus.planned, DispatchStatus.in_transit, DispatchStatus.delivered] },
                    plannedDate: { gte: startOfMonth, lte: endOfMonth },
                },
            },
            select: {
                quantityDispatched: true,
                dispatchPlan: { select: { customerId: true } },
                challanItem: { select: { partNumber: true } },
            },
        });

        // ── 5. Part master — universal part list for ALL customers ───────────────
        // Parts have organizationId but no direct customer link.
        // We show ALL org parts for EVERY customer so every (line × part) cell
        // is always available for target-setting, regardless of order/challan history.
        const parts = await this.prisma.part.findMany({
            where: { organizationId: orgId, isActive: true },
            select: { partNumber: true, partName: true, description: true },
            orderBy: { partNumber: 'asc' },
        });

        // Build part name map and sorted part number list
        const partNameMap = new Map<string, string>();
        const allPartNumbers: string[] = [];
        for (const p of parts) {
            partNameMap.set(p.partNumber, p.partName || p.description || p.partNumber);
            allPartNumbers.push(p.partNumber);
        }

        // Collect descriptions from challan items as fallback for parts not in master
        const challanDescMap = new Map<string, string>();
        for (const ci of challanItems) {
            if (ci.partDescription && !challanDescMap.has(ci.partNumber)) {
                challanDescMap.set(ci.partNumber, ci.partDescription);
            }
        }

        // ── Build WIP map: key = "customerId__partNumber" → wip qty ──────────
        const wipMap = new Map<string, number>();
        for (const ci of challanItems) {
            const key = `${ci.challan.customerId}__${ci.partNumber}`;
            const lastProcessCompleted = ci.jobProcesses[0]?.completedQuantity ?? 0;
            const wip = Math.max(0, ci.quantityIssued - lastProcessCompleted);
            wipMap.set(key, (wipMap.get(key) ?? 0) + wip);
        }

        // ── Build dispatched map: key = "customerId__partNumber" → dispatched ─
        const dispatchedMap = new Map<string, number>();
        for (const di of dispatchItems) {
            const key = `${di.dispatchPlan.customerId}__${di.challanItem.partNumber}`;
            dispatchedMap.set(key, (dispatchedMap.get(key) ?? 0) + di.quantityDispatched);
        }

        // ── Build line groups ─────────────────────────────────────────────────
        // Each customer (line) gets ALL active parts from the Part master.
        // Rows with no activity (zero targets, WIP, dispatched) are filtered
        // client-side so planners can reveal them on demand to set targets.
        const lines: LineGroup[] = [];

        for (const customer of customers) {
            // Use the full org part master list for every customer
            const partNumbers = allPartNumbers;

            if (partNumbers.length === 0) {
                lines.push({
                    customerId: customer.id,
                    lineName: customer.companyName,
                    customerCode: customer.code,
                    rows: [],
                    totals: { monthlyTarget: 0, week1Target: 0, week2Target: 0, week3Target: 0, week4Target: 0, readyForDispatch: 0, dispatched: 0, wip: 0, balance: 0 },
                });
                continue;
            }

            const rows: LineDeadlineRow[] = partNumbers.map(partNumber => {
                const key = `${customer.id}__${partNumber}`;
                const target = targetMap.get(key);
                const dispatched = dispatchedMap.get(key) ?? 0;
                const wip = wipMap.get(key) ?? 0;
                const monthlyTarget = target?.monthlyTarget ?? 0;

                return {
                    customerId: customer.id,
                    partNumber,
                    partName: partNameMap.get(partNumber) || challanDescMap.get(partNumber) || partNumber,
                    month,
                    year,
                    monthlyTarget,
                    week1Target: target?.week1Target ?? 0,
                    week2Target: target?.week2Target ?? 0,
                    week3Target: target?.week3Target ?? 0,
                    week4Target: target?.week4Target ?? 0,
                    readyForDispatch: target?.readyForDispatch ?? 0,
                    dispatched,
                    wip,
                    balance: Math.max(0, monthlyTarget - dispatched),
                    notes: target?.notes ?? null,
                };
            });

            const totals = rows.reduce(
                (acc, r) => ({
                    monthlyTarget: acc.monthlyTarget + r.monthlyTarget,
                    week1Target: acc.week1Target + r.week1Target,
                    week2Target: acc.week2Target + r.week2Target,
                    week3Target: acc.week3Target + r.week3Target,
                    week4Target: acc.week4Target + r.week4Target,
                    readyForDispatch: acc.readyForDispatch + r.readyForDispatch,
                    dispatched: acc.dispatched + r.dispatched,
                    wip: acc.wip + r.wip,
                    balance: acc.balance + r.balance,
                }),
                { monthlyTarget: 0, week1Target: 0, week2Target: 0, week3Target: 0, week4Target: 0, readyForDispatch: 0, dispatched: 0, wip: 0, balance: 0 }
            );

            lines.push({ customerId: customer.id, lineName: customer.companyName, customerCode: customer.code, rows, totals });
        }

        const grandTotals = lines.reduce(
            (acc, l) => ({
                monthlyTarget: acc.monthlyTarget + l.totals.monthlyTarget,
                dispatched: acc.dispatched + l.totals.dispatched,
                wip: acc.wip + l.totals.wip,
                readyForDispatch: acc.readyForDispatch + l.totals.readyForDispatch,
                balance: acc.balance + l.totals.balance,
            }),
            { monthlyTarget: 0, dispatched: 0, wip: 0, readyForDispatch: 0, balance: 0 }
        );

        return { month, year, lines, grandTotals };
    }

    // ─── UPSERT: Save targets for one or many rows ───────────────────────────
    async upsertTargets(orgId: string, items: UpsertLineDeadlineDto[]) {
        const results = [];
        for (const item of items) {
            const result = await this.prisma.lineDeadline.upsert({
                where: {
                    organizationId_customerId_partNumber_month_year: {
                        organizationId: orgId,
                        customerId: item.customerId,
                        partNumber: item.partNumber,
                        month: item.month,
                        year: item.year,
                    },
                },
                create: {
                    organizationId: orgId,
                    customerId: item.customerId,
                    partNumber: item.partNumber,
                    month: item.month,
                    year: item.year,
                    monthlyTarget: item.monthlyTarget ?? 0,
                    week1Target: item.week1Target ?? 0,
                    week2Target: item.week2Target ?? 0,
                    week3Target: item.week3Target ?? 0,
                    week4Target: item.week4Target ?? 0,
                    readyForDispatch: item.readyForDispatch ?? 0,
                    notes: item.notes ?? null,
                },
                update: {
                    ...(item.monthlyTarget !== undefined && { monthlyTarget: item.monthlyTarget }),
                    ...(item.week1Target !== undefined && { week1Target: item.week1Target }),
                    ...(item.week2Target !== undefined && { week2Target: item.week2Target }),
                    ...(item.week3Target !== undefined && { week3Target: item.week3Target }),
                    ...(item.week4Target !== undefined && { week4Target: item.week4Target }),
                    ...(item.readyForDispatch !== undefined && { readyForDispatch: item.readyForDispatch }),
                    ...(item.notes !== undefined && { notes: item.notes }),
                },
            });
            results.push(result);
        }
        return results;
    }

    // ─── ADD PART: Manually add a part to a line for a month ────────────────
    async addPartToLine(orgId: string, dto: UpsertLineDeadlineDto) {
        // Verify customer belongs to this org
        const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, organizationId: orgId },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        return this.prisma.lineDeadline.upsert({
            where: {
                organizationId_customerId_partNumber_month_year: {
                    organizationId: orgId,
                    customerId: dto.customerId,
                    partNumber: dto.partNumber,
                    month: dto.month,
                    year: dto.year,
                },
            },
            create: {
                organizationId: orgId,
                customerId: dto.customerId,
                partNumber: dto.partNumber,
                month: dto.month,
                year: dto.year,
                monthlyTarget: dto.monthlyTarget ?? 0,
                week1Target: dto.week1Target ?? 0,
                week2Target: dto.week2Target ?? 0,
                week3Target: dto.week3Target ?? 0,
                week4Target: dto.week4Target ?? 0,
                readyForDispatch: dto.readyForDispatch ?? 0,
                notes: dto.notes ?? null,
            },
            update: {
                ...(dto.monthlyTarget !== undefined && { monthlyTarget: dto.monthlyTarget }),
                ...(dto.week1Target !== undefined && { week1Target: dto.week1Target }),
                ...(dto.week2Target !== undefined && { week2Target: dto.week2Target }),
                ...(dto.week3Target !== undefined && { week3Target: dto.week3Target }),
                ...(dto.week4Target !== undefined && { week4Target: dto.week4Target }),
                ...(dto.readyForDispatch !== undefined && { readyForDispatch: dto.readyForDispatch }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
            },
        });
    }
}