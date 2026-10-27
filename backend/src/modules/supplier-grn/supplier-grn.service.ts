import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GRNStatus } from '@prisma/client';

export interface CreateGRNItemDto {
    poItemId?: string;
    partNumber: string;
    partDescription?: string;
    expectedQty?: number;
    receivedQty: number;
    rejectedQty?: number;
    remarks?: string;
}

export interface CreateSupplierGRNDto {
    grnDate: string | Date;
    supplierId: string;
    poId?: string;
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    invoiceNumber?: string;
    remarks?: string;
    items: CreateGRNItemDto[];
}

@Injectable()
export class SupplierGRNService {
    constructor(private prisma: PrismaService) {}

    // ─── Generate unique GRN number ───────────────────────────────────────────
    private async generateGRNNumber(organizationId: string): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `GRN/${year}/${month}/`;

        // Count existing GRNs for this org in this month
        const count = await this.prisma.supplierGRN.count({
            where: {
                organizationId,
                grnNumber: { startsWith: prefix },
            },
        });
        return `${prefix}${String(count + 1).padStart(3, '0')}`;
    }

    // ─── Create GRN ───────────────────────────────────────────────────────────
    async create(dto: CreateSupplierGRNDto, userId: string, organizationId: string) {
        // Validate supplier
        const supplier = await this.prisma.supplier.findFirst({
            where: { id: dto.supplierId, organizationId },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');

        // Validate PO if provided
        if (dto.poId) {
            const po = await this.prisma.purchaseOrder.findFirst({
                where: { id: dto.poId, organizationId },
            });
            if (!po) throw new NotFoundException('Purchase Order not found');
        }

        // Validate items
        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('At least one GRN item is required');
        }
        for (const item of dto.items) {
            if (item.receivedQty <= 0) {
                throw new BadRequestException(`Received quantity must be > 0 for part ${item.partNumber}`);
            }
            const rejected = item.rejectedQty ?? 0;
            if (rejected < 0 || rejected > item.receivedQty) {
                throw new BadRequestException(`Rejected qty cannot exceed received qty for part ${item.partNumber}`);
            }
        }

        const grnNumber = await this.generateGRNNumber(organizationId);

        return this.prisma.supplierGRN.create({
            data: {
                grnNumber,
                organizationId,
                supplierId: dto.supplierId,
                poId: dto.poId ?? null,
                grnDate: new Date(dto.grnDate),
                vehicleNumber: dto.vehicleNumber ?? null,
                driverName: dto.driverName ?? null,
                driverPhone: dto.driverPhone ?? null,
                invoiceNumber: dto.invoiceNumber ?? null,
                remarks: dto.remarks ?? null,
                status: GRNStatus.received,
                receivedById: userId,
                items: {
                    create: dto.items.map(item => ({
                        partNumber: item.partNumber,
                        partDescription: item.partDescription ?? null,
                        poItemId: item.poItemId ?? null,
                        expectedQty: item.expectedQty ?? 0,
                        receivedQty: item.receivedQty,
                        rejectedQty: item.rejectedQty ?? 0,
                        remarks: item.remarks ?? null,
                    })),
                },
            },
            include: {
                supplier: { select: { id: true, companyName: true, supplierCode: true } },
                purchaseOrder: { select: { id: true, poNumber: true } },
                receivedBy: { select: { id: true, firstName: true, lastName: true } },
                items: true,
            },
        });
    }

    // ─── List GRNs ────────────────────────────────────────────────────────────
    async findAll(organizationId: string, filters?: {
        supplierId?: string;
        poId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        search?: string;
    }) {
        const where: any = { organizationId };
        if (filters?.supplierId) where.supplierId = filters.supplierId;
        if (filters?.poId) where.poId = filters.poId;
        if (filters?.dateFrom || filters?.dateTo) {
            where.grnDate = {};
            if (filters.dateFrom) where.grnDate.gte = filters.dateFrom;
            if (filters.dateTo) where.grnDate.lte = filters.dateTo;
        }
        if (filters?.search) {
            where.OR = [
                { grnNumber: { contains: filters.search, mode: 'insensitive' } },
                { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
                { supplier: { companyName: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }

        return this.prisma.supplierGRN.findMany({
            where,
            include: {
                supplier: { select: { id: true, companyName: true, supplierCode: true } },
                purchaseOrder: { select: { id: true, poNumber: true } },
                receivedBy: { select: { id: true, firstName: true, lastName: true } },
                items: true,
            },
            orderBy: { grnDate: 'desc' },
        });
    }

    // ─── Get single GRN ───────────────────────────────────────────────────────
    async findOne(id: string, organizationId: string) {
        const grn = await this.prisma.supplierGRN.findFirst({
            where: { id, organizationId },
            include: {
                supplier: true,
                purchaseOrder: { include: { items: true } },
                receivedBy: { select: { id: true, firstName: true, lastName: true } },
                inspectedBy: { select: { id: true, firstName: true, lastName: true } },
                items: { include: { poItem: true } },
            },
        });
        if (!grn) throw new NotFoundException('GRN not found');
        return grn;
    }

    // ─── Store Balance (live computed) ────────────────────────────────────────
    // storeBalance = Σ(GRN accepted qty) - Σ(challan dispatched qty)
    // acceptedQty = receivedQty - rejectedQty
    async getStoreBalance(organizationId: string, partNumber?: string) {
        // 1. Sum up accepted qty from all GRNs
        const grnWhere: any = { grn: { organizationId } };
        if (partNumber) grnWhere.partNumber = partNumber;

        const grnItems = await this.prisma.supplierGRNItem.findMany({
            where: grnWhere,
            select: { partNumber: true, receivedQty: true, rejectedQty: true },
        });

        const inwardMap = new Map<string, number>();
        for (const item of grnItems) {
            const accepted = item.receivedQty - item.rejectedQty;
            inwardMap.set(item.partNumber, (inwardMap.get(item.partNumber) || 0) + accepted);
        }

        // 2. Sum up issued qty from all challans
        const challanWhere: any = {
            challan: {
                vendor: { organizationId },
                status: { notIn: ['rejected', 'cancelled'] as any },
            },
        };
        if (partNumber) challanWhere.partNumber = partNumber;

        const challanItems = await this.prisma.challanItem.findMany({
            where: challanWhere,
            select: { partNumber: true, quantityIssued: true },
        });

        const issuedMap = new Map<string, number>();
        for (const ci of challanItems) {
            issuedMap.set(ci.partNumber, (issuedMap.get(ci.partNumber) || 0) + ci.quantityIssued);
        }

        // 3. Build balance result
        const allParts = new Set([...inwardMap.keys(), ...issuedMap.keys()]);
        const result: { partNumber: string; receivedFromSupplier: number; dispatchedToVendors: number; storeBalance: number }[] = [];

        for (const pn of allParts) {
            if (partNumber && pn !== partNumber) continue;
            const received = inwardMap.get(pn) || 0;
            const dispatched = issuedMap.get(pn) || 0;
            result.push({
                partNumber: pn,
                receivedFromSupplier: received,
                dispatchedToVendors: dispatched,
                storeBalance: received - dispatched,
            });
        }

        return result.sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    }

    // ─── PO pending qty (carry-forward) ───────────────────────────────────────
    // pendingFromSupplier = Σ(POItem.quantity for open POs) - Σ(GRNItem.receivedQty for those PO items)
    async getPOPendingByPart(organizationId: string) {
        // Get all active/approved POs with their items
        const poItems = await this.prisma.pOItem.findMany({
            where: {
                po: {
                    organizationId,
                    status: { in: ['approved', 'in_progress'] as any },
                },
            },
            select: {
                id: true,
                partNumber: true,
                quantity: true,
                deliverySchedule: true,
                po: { select: { id: true, poNumber: true, poDate: true, status: true } },
                grnItems: { select: { receivedQty: true } },
            },
        });

        const pendingMap = new Map<string, {
            totalOrdered: number;
            totalReceivedAgainstPO: number;
            pendingFromSupplier: number;
        }>();

        for (const item of poItems) {
            const received = item.grnItems.reduce((s, g) => s + g.receivedQty, 0);
            const pending = Math.max(0, item.quantity - received);

            const existing = pendingMap.get(item.partNumber) || { totalOrdered: 0, totalReceivedAgainstPO: 0, pendingFromSupplier: 0 };
            pendingMap.set(item.partNumber, {
                totalOrdered: existing.totalOrdered + item.quantity,
                totalReceivedAgainstPO: existing.totalReceivedAgainstPO + received,
                pendingFromSupplier: existing.pendingFromSupplier + pending,
            });
        }

        return pendingMap;
    }
}
