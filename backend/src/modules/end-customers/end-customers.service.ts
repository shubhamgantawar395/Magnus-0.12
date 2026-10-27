import { Injectable, ConflictException, NotFoundException, Inject, Scope } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEndCustomerDto } from './dto/create-end-customer.dto';
import { UpdateEndCustomerDto } from './dto/update-end-customer.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class EndCustomersService {
    constructor(
        private prisma: PrismaService,
        @Inject(REQUEST) private request: Request,
    ) { }

    private getOrganizationId(): string {
        const user = this.request.user as any;
        if (user.role === 'platform_admin' && this.request.query.organizationId) {
            return this.request.query.organizationId as string;
        }
        return user.organizationId;
    }

    async create(createEndCustomerDto: CreateEndCustomerDto) {
        const organizationId = this.getOrganizationId();

        const existingCustomer = await this.prisma.endCustomer.findFirst({
            where: {
                organizationId,
                code: createEndCustomerDto.code
            }
        });

        if (existingCustomer) {
            throw new ConflictException('Customer with this code already exists');
        }

        return this.prisma.endCustomer.create({
            data: {
                ...createEndCustomerDto,
                organizationId
            }
        });
    }

    async findAll() {
        const organizationId = this.getOrganizationId();
        return this.prisma.endCustomer.findMany({
            where: { organizationId },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        const organizationId = this.getOrganizationId();
        const customer = await this.prisma.endCustomer.findFirst({
            where: { id, organizationId }
        });

        if (!customer) {
            throw new NotFoundException('End Customer not found');
        }

        return customer;
    }

    async update(id: string, updateEndCustomerDto: UpdateEndCustomerDto) {
        await this.findOne(id); // Ensure exists and belongs to org

        return this.prisma.endCustomer.update({
            where: { id },
            data: updateEndCustomerDto
        });
    }

    async remove(id: string) {
        await this.findOne(id); // Ensure exists and belongs to org

        return this.prisma.endCustomer.delete({
            where: { id }
        });
    }
}
