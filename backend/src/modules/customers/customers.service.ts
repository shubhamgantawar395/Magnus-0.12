import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }

    async create(createCustomerDto: CreateCustomerDto, createdById: string, organizationId?: string) {
        // Check if GSTIN already exists within the same organization
        const existingCustomer = await this.prisma.customer.findFirst({
            where: {
                gstin: createCustomerDto.gstin,
                organizationId: organizationId || undefined
            }
        });

        if (existingCustomer) {
            throw new ConflictException('Customer with this GSTIN already exists');
        }

        const code = `CUST-${Date.now()}`;

        const { contactEmail, contactPhone, ...rest } = createCustomerDto;

        return this.prisma.customer.create({
            data: {
                code,
                ...rest,
                email: contactEmail,
                phone: contactPhone,
                createdBy: createdById ? { connect: { id: createdById } } : undefined,
                organization: organizationId ? { connect: { id: organizationId } } : undefined
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    }

    async findAll(page: number = 1, limit: number = 20, search?: string, organizationId?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (organizationId) {
            where.organizationId = organizationId;
        }

        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' as const } },
                { gstin: { contains: search, mode: 'insensitive' as const } },
                { city: { contains: search, mode: 'insensitive' as const } }
            ];
        }

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    _count: {
                        select: {
                            vendors: true,
                            deliveryChallans: true
                        }
                    }
                }
            }),
            this.prisma.customer.count({ where })
        ]);

        return {
            data: customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findOne(id: string, organizationId?: string) {
        const whereMatch: any = { id };
        if (organizationId) {
            whereMatch.organizationId = organizationId;
        }

        const customer = await this.prisma.customer.findFirst({
            where: whereMatch,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                },
                vendors: {
                    select: {
                        id: true,
                        vendorCode: true,
                        companyName: true,
                        status: true
                    }
                },
                _count: {
                    select: {
                        deliveryChallans: true
                    }
                }
            }
        });

        if (!customer) {
            throw new NotFoundException(`Customer with ID ${id} not found`);
        }

        return customer;
    }

    async update(id: string, updateCustomerDto: UpdateCustomerDto, organizationId?: string) {
        // Check if customer exists
        await this.findOne(id, organizationId);

        // If updating GSTIN, check for conflicts
        if (updateCustomerDto.gstin) {
            const existingCustomer = await this.prisma.customer.findFirst({
                where: {
                    gstin: updateCustomerDto.gstin,
                    organizationId: organizationId || undefined,
                    NOT: { id }
                }
            });

            if (existingCustomer) {
                throw new ConflictException('Another customer with this GSTIN already exists');
            }
        }

        return this.prisma.customer.update({
            where: { id },
            data: updateCustomerDto,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
    }

    async remove(id: string, organizationId?: string) {
        // Check if customer exists
        await this.findOne(id, organizationId);

        // Check if customer has vendors or challans
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        vendors: true,
                        deliveryChallans: true
                    }
                }
            }
        });

        if (customer._count.vendors > 0 || customer._count.deliveryChallans > 0) {
            throw new ConflictException('Cannot delete customer with existing vendors or challans');
        }

        await this.prisma.customer.delete({
            where: { id }
        });

        return { message: 'Customer deleted successfully' };
    }
}
