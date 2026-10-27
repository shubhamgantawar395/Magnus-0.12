import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MachinesService {
    constructor(private prisma: PrismaService) { }

    async create(dto: any, organizationId: string) {
        return this.prisma.machine.create({
            data: { ...dto, organizationId },
        });
    }

    async findAll(organizationId: string, filters: { isActive?: boolean; department?: string } = {}) {
        return this.prisma.machine.findMany({
            where: {
                organizationId,
                ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
                ...(filters.department ? { department: filters.department } : {}),
            },
            orderBy: { machineCode: 'asc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const machine = await this.prisma.machine.findFirst({
            where: { id, organizationId },
        });
        if (!machine) throw new NotFoundException('Machine not found');
        return machine;
    }

    async update(id: string, dto: any, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.machine.update({ where: { id }, data: dto });
    }

    async remove(id: string, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.machine.delete({ where: { id } });
    }
}
