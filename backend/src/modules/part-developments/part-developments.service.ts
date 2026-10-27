import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DevStage } from '@prisma/client';

@Injectable()
export class PartDevelopmentsService {
    constructor(private prisma: PrismaService) { }

    async create(dto: any, organizationId: string) {
        return this.prisma.partDevelopment.create({
            data: { ...dto, organizationId },
            include: { part: true, vendor: true },
        });
    }

    async findAll(organizationId: string, filters: { vendorId?: string; partId?: string; stage?: string } = {}) {
        return this.prisma.partDevelopment.findMany({
            where: {
                organizationId,
                ...(filters.vendorId ? { vendorId: filters.vendorId } : {}),
                ...(filters.partId ? { partId: filters.partId } : {}),
                ...(filters.stage ? { stage: filters.stage as DevStage } : {}),
            },
            include: { part: true, vendor: true, approvedBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const record = await this.prisma.partDevelopment.findFirst({
            where: { id, organizationId },
            include: { part: true, vendor: true, faiRecords: true, approvedBy: true },
        });
        if (!record) throw new NotFoundException('Part development record not found');
        return record;
    }

    async update(id: string, dto: any, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.partDevelopment.update({ where: { id }, data: dto, include: { part: true, vendor: true } });
    }

    async approve(id: string, userId: string, organizationId: string, remarks?: string) {
        await this.findOne(id, organizationId);
        return this.prisma.partDevelopment.update({
            where: { id },
            data: { stage: DevStage.approved, approvedById: userId, approvedAt: new Date(), remarks },
        });
    }

    async reject(id: string, organizationId: string, rejectionReason: string) {
        await this.findOne(id, organizationId);
        return this.prisma.partDevelopment.update({
            where: { id },
            data: { stage: DevStage.rejected, rejectionReason },
        });
    }

    async remove(id: string, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.partDevelopment.delete({ where: { id } });
    }
}
