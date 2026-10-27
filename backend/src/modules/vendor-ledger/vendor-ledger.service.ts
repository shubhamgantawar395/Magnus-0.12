import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LedgerEntryType } from '@prisma/client';

@Injectable()
export class VendorLedgerService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string, filters: { vendorId?: string; partNumber?: string } = {}) {
        return this.prisma.vendorMaterialLedger.findMany({
            where: {
                organizationId,
                ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
                ...(filters.partNumber ? { partNumber: filters.partNumber } : {}),
            },
            include: { vendor: true, challan: true, receipt: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getBalance(organizationId: string, filters: { vendorId?: string; partNumber?: string } = {}) {
        // Get the latest balanceAfter per (vendorId, partNumber) combination
        const entries = await this.prisma.vendorMaterialLedger.findMany({
            where: {
                organizationId,
                ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
                ...(filters.partNumber ? { partNumber: filters.partNumber } : {}),
            },
            orderBy: { createdAt: 'desc' },
            distinct: ['vendorId', 'partNumber'],
            select: { vendorId: true, partNumber: true, balanceAfter: true, createdAt: true },
        });
        return entries.map(e => ({
            vendorId: e.vendorId,
            partNumber: e.partNumber,
            currentBalance: e.balanceAfter,
            lastEntryAt: e.createdAt,
        }));
    }

    async addAdjustment(dto: { vendorId: string; partNumber: string; quantity: number; remarks: string }, organizationId: string) {
        // Get current balance
        const lastEntry = await this.prisma.vendorMaterialLedger.findFirst({
            where: { organizationId, vendorId: dto.vendorId, partNumber: dto.partNumber },
            orderBy: { createdAt: 'desc' },
        });
        const currentBalance = lastEntry?.balanceAfter ?? 0;
        return this.prisma.vendorMaterialLedger.create({
            data: {
                organizationId,
                vendorId: dto.vendorId,
                partNumber: dto.partNumber,
                entryType: LedgerEntryType.adjustment,
                quantity: dto.quantity,
                balanceAfter: currentBalance + dto.quantity,
                remarks: dto.remarks,
            },
        });
    }
}
