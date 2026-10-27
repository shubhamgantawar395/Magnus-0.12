import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerOrderStatus } from '@prisma/client';

@Injectable()
export class CustomerOrdersService {
    constructor(private prisma: PrismaService) { }

    async create(dto: any, organizationId: string) {
        const { items, ...orderData } = dto;
        return this.prisma.customerOrder.create({
            data: {
                ...orderData,
                organizationId,
                items: items ? { create: items } : undefined,
            },
            include: { customer: true, items: true },
        });
    }

    async findAll(organizationId: string, filters: { customerId?: string; status?: string } = {}) {
        return this.prisma.customerOrder.findMany({
            where: {
                organizationId,
                ...(filters.customerId ? { customerId: filters.customerId } : {}),
                ...(filters.status ? { status: filters.status as CustomerOrderStatus } : {}),
            },
            include: { customer: true, items: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const order = await this.prisma.customerOrder.findFirst({
            where: { id, organizationId },
            include: { customer: true, items: true },
        });
        if (!order) throw new NotFoundException('Customer order not found');
        return order;
    }

    async update(id: string, dto: any, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.customerOrder.update({ where: { id }, data: dto, include: { customer: true } });
    }

    async remove(id: string, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.customerOrder.delete({ where: { id } });
    }
}
