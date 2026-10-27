import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDispatchPlanDto } from './dto/create-dispatch-plan.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateDispatchPlanDto } from './dto/update-dispatch-plan.dto';
import { DispatchStatus } from '@prisma/client';

@Injectable()
export class DispatchService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(createDispatchPlanDto: CreateDispatchPlanDto, createdById: string) {
        const { items, ...planData } = createDispatchPlanDto;

        return this.prisma.dispatchPlan.create({
            data: {
                ...planData,
                plannedDate: new Date(createDispatchPlanDto.plannedDate),
                status: DispatchStatus.planned,
                createdById,
                items: {
                    create: items
                }
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        companyName: true
                    }
                },
                vendor: {
                    select: {
                        id: true,
                        vendorCode: true,
                        companyName: true
                    }
                },
                items: {
                    include: {
                        challanItem: {
                            select: {
                                id: true,
                                partNumber: true,
                                partDescription: true
                            }
                        }
                    }
                }
            }
        });
    }

    async findAll(page: number = 1, limit: number = 20, vendorId?: string, status?: DispatchStatus) {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (vendorId) where.vendorId = vendorId;
        if (status) where.status = status;

        const [plans, total] = await Promise.all([
            this.prisma.dispatchPlan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { plannedDate: 'desc' },
                include: {
                    vendor: {
                        select: {
                            id: true,
                            vendorCode: true,
                            companyName: true
                        }
                    },
                    _count: {
                        select: {
                            items: true
                        }
                    }
                }
            }),
            this.prisma.dispatchPlan.count({ where })
        ]);

        return {
            data: plans,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findOne(id: string) {
        const plan = await this.prisma.dispatchPlan.findUnique({
            where: { id },
            include: {
                customer: true,
                vendor: true,
                items: {
                    include: {
                        challanItem: {
                            include: {
                                challan: {
                                    select: {
                                        challanNumber: true
                                    }
                                }
                            }
                        }
                    }
                },
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

        if (!plan) {
            throw new NotFoundException(`Dispatch plan with ID ${id} not found`);
        }

        return plan;
    }

    async update(id: string, updateDispatchPlanDto: UpdateDispatchPlanDto) {
        await this.findOne(id);

        return this.prisma.dispatchPlan.update({
            where: { id },
            data: updateDispatchPlanDto
        });
    }

    async confirm(id: string) {
        const plan = await this.findOne(id);

        const updatedPlan = await this.prisma.dispatchPlan.update({
            where: { id },
            data: {
                status: DispatchStatus.in_transit
            }
        });

        // Notify customer users
        try {
            if (plan.customer) {
                // Find users in that customer's organization (Executive users)
                const customer = await this.prisma.customer.findUnique({
                    where: { id: plan.customerId },
                    select: { organizationId: true }
                });

                if (customer?.organizationId) {
                    const customerUsers = await this.prisma.user.findMany({
                        where: {
                            organizationId: customer.organizationId,
                            role: {
                                in: ['executive', 'production_manager', 'ppc_manager', 'quality_head', 'gm', 'director']
                            }
                        },
                        select: { id: true }
                    });

                    if (customerUsers.length > 0) {
                        await this.notificationsService.createSystemNotification(
                            customer.organizationId,
                            'dispatch_confirmed',
                            'Dispatch Plan Confirmed',
                            `Dispatch Plan for ${plan.vendor.companyName} scheduled for ${new Date(plan.plannedDate).toLocaleDateString()} has been confirmed and is in transit.`,
                            customerUsers.map(u => u.id),
                            {
                                severity: 'medium',
                                entityType: 'dispatch_plan',
                                entityId: plan.id,
                                actionUrl: `/dashboard/dispatch-tracker`
                            }
                        );
                    }
                }
            }

        } catch (error) {
            console.error('Failed to send notification for dispatch confirmation:', error);
        }

        return updatedPlan;
    }

    async remove(id: string) {
        await this.findOne(id);

        await this.prisma.dispatchPlan.delete({
            where: { id }
        });

        return { message: 'Dispatch plan deleted successfully' };
    }
}
