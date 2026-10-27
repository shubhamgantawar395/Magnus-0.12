import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReceiptStatus } from '@prisma/client';

@Injectable()
export class MaterialReceiptsService {
    constructor(private prisma: PrismaService) { }

    // ── Auto-generate GRN number: GRN/2026/03/001 ─────────────────────────────
    private async generateReceiptNumber(receiptDate: Date): Promise<string> {
        const year = receiptDate.getFullYear();
        const month = String(receiptDate.getMonth() + 1).padStart(2, '0');
        const startOfMonth = new Date(year, receiptDate.getMonth(), 1);
        const count = await this.prisma.materialReceipt.count({
            where: { receiptDate: { gte: startOfMonth } },
        });
        const seq = String(count + 1).padStart(3, '0');
        return `GRN/${year}/${month}/${seq}`;
    }

    // ── Get open challans (issued, at vendor) for incoming inspection ─────────
    async getOpenChallans(organizationId: string, vendorId?: string) {
        const where: any = {
            vendor: { organizationId },
            status: { in: ['issued', 'received'] as any },
        };
        if (vendorId) where.vendorId = vendorId;
        return this.prisma.deliveryChallan.findMany({
            where,
            include: {
                vendor: { select: { id: true, companyName: true, vendorCode: true } },
                items: {
                    include: {
                        receiptItems: {
                            select: { receivedQty: true },
                        },
                    },
                },
            },
            orderBy: { challanDate: 'desc' },
        });
    }

    async create(dto: any, receivedById: string, organizationId: string) {
        const { items, ...receiptData } = dto;
        // Auto-generate GRN number if not supplied
        if (!receiptData.receiptNumber) {
            receiptData.receiptNumber = await this.generateReceiptNumber(
                receiptData.receiptDate ? new Date(receiptData.receiptDate) : new Date(),
            );
        }
        if (!receiptData.receiptDate) {
            receiptData.receiptDate = new Date();
        }
        return this.prisma.materialReceipt.create({
            data: {
                ...receiptData,
                organizationId,
                receivedById,
                items: items ? { create: items } : undefined,
            },
            include: { vendor: true, items: { include: { challanItem: true } }, receivedBy: true },
        });
    }

    async findAll(organizationId: string, filters: { vendorId?: string; status?: string } = {}) {
        return this.prisma.materialReceipt.findMany({
            where: {
                organizationId,
                ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
                ...(filters.status ? { status: filters.status as ReceiptStatus } : {}),
            },
            include: { vendor: true, receivedBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const receipt = await this.prisma.materialReceipt.findFirst({
            where: { id, organizationId },
            include: {
                vendor: true,
                items: {
                    include: {
                        challanItem: {
                            include: {
                                challan: { select: { challanNumber: true, poNumber: true } },
                            },
                        },
                    },
                },
                receivedBy: { select: { firstName: true, lastName: true } },
                dispatchPlan: true,
            },
        });
        if (!receipt) throw new NotFoundException('Material receipt not found');
        return receipt;
    }

    async update(id: string, dto: any, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.materialReceipt.update({ where: { id }, data: dto });
    }

    async inspect(id: string, status: string, organizationId: string, remarks?: string) {
        await this.findOne(id, organizationId);
        return this.prisma.materialReceipt.update({
            where: { id },
            data: { status: status as ReceiptStatus, remarks },
        });
    }

    async remove(id: string, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.materialReceipt.delete({ where: { id } });
    }
}
