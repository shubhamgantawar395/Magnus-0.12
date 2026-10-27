import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

import { CreateChallanDto } from './dto/create-challan.dto';
import { UpdateChallanDto } from './dto/update-challan.dto';
import { ChallanStatus } from '@prisma/client';

@Injectable()
export class ChallansService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    /**
     * Generate challan number in format: DC/YYYY/MM/XXX
     */
    private async generateChallanNumber(challanDate: Date): Promise<string> {
        const year = challanDate.getFullYear();
        const month = String(challanDate.getMonth() + 1).padStart(2, '0');

        // Get the count of challans for this month
        const startOfMonth = new Date(year, challanDate.getMonth(), 1);
        const endOfMonth = new Date(year, challanDate.getMonth() + 1, 0, 23, 59, 59);

        const count = await this.prisma.deliveryChallan.count({
            where: {
                challanDate: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });

        const sequence = String(count + 1).padStart(3, '0');
        return `DC/${year}/${month}/${sequence}`;
    }

    async create(createChallanDto: CreateChallanDto, createdById: string) {
        // Verify customer exists — support both direct Customer.id AND Organization.id (for PPC/admin users)
        let customer = await this.prisma.customer.findUnique({
            where: { id: createChallanDto.customerId }
        });

        if (!customer) {
            // Fallback: treat customerId as an organizationId and find the linked Customer
            customer = await this.prisma.customer.findFirst({
                where: { organizationId: createChallanDto.customerId }
            });
        }

        if (!customer) {
            throw new NotFoundException('Customer not found. Ensure a Customer is linked to your Organization.');
        }

        // Verify vendor exists and is approved
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: createChallanDto.vendorId }
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found');
        }

        if (vendor.status !== 'approved') {
            throw new BadRequestException('Vendor must be approved before issuing challans');
        }

        // Verify PO if provided
        let poData: any = {};
        if (createChallanDto.poId) {
            const po = await this.prisma.purchaseOrder.findUnique({
                where: { id: createChallanDto.poId }
            });
            if (!po) {
                throw new NotFoundException('Purchase Order not found');
            }
            if (po.vendorId !== createChallanDto.vendorId) {
                throw new BadRequestException('PO does not belong to the selected vendor');
            }
            poData = {
                poId: po.id,
                poNumber: po.poNumber, // Auto-fill PO Number if linked
                jobWorkType: po.jobWorkType
            };
        }

        // Calculate total quantity
        const totalQuantity = createChallanDto.items.reduce(
            (sum, item) => sum + item.quantityIssued,
            0
        );

        // Generate challan number
        const challanDate = new Date(createChallanDto.challanDate);
        const challanNumber = await this.generateChallanNumber(challanDate);

        // Create challan with items
        const { items, ...challanData } = createChallanDto;

        // Prepare items with explicit poItemId mapping
        // Logic: if item has poItemId, use it.
        const itemsToCreate = items.map(item => ({
            partNumber: item.partNumber,
            partDescription: item.partDescription,
            hsnCode: item.hsnCode,
            outputPartNumber: item.outputPartNumber,
            outputDescription: item.outputDescription,
            poItemId: item.poItemId || null, // Link to PO Item
            quantityIssued: item.quantityIssued,
            unitOfMeasure: item.unitOfMeasure,
            materialGrade: item.materialGrade,
            drawingReference: item.drawingReference,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount
        }));

        const challan = await this.prisma.deliveryChallan.create({
            data: {
                ...challanData,
                customerId: customer.id, // Use the resolved real Customer ID
                ...poData, // Apply linking data
                challanNumber,
                challanDate,
                totalQuantity,
                status: ChallanStatus.issued,
                createdById,
                items: {
                    create: itemsToCreate
                }
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        companyName: true,
                        gstin: true
                    }
                },
                vendor: {
                    select: {
                        id: true,
                        vendorCode: true,
                        companyName: true,
                        gstin: true
                    }
                },
                items: true,
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

        // Determine Notification Direction based on Creator Role
        try {
            const creator = await this.prisma.user.findUnique({
                where: { id: createdById },
                select: { role: true }
            });

            const orgRoles = ['ppc_manager', 'executive', 'production_manager', 'store_head', 'quality_head', 'admin', 'gm', 'director'];
            const isOrgCreator = creator && orgRoles.includes(creator.role);

            if (isOrgCreator) {
                // Case 1: Organization (PPC) created Challan -> Notify Vendor
                const vendorUsers = await this.prisma.user.findMany({
                    where: {
                        vendorId: challan.vendorId, // Users linked to this vendor
                        isActive: true
                    },
                    select: { id: true }
                });

                if (vendorUsers.length > 0) {
                    await this.notificationsService.createSystemNotification(
                        challan.customerId, // Context is still the Customer Organization
                        'challan_received',
                        'New Challan Received',
                        `You have received Challan ${challan.challanNumber} from ${challan.customer.companyName}.`,
                        vendorUsers.map(u => u.id),
                        {
                            severity: 'medium',
                            entityType: 'challan',
                            entityId: challan.id,
                            actionUrl: `/dashboard/vendor/challans/${challan.id}`
                        }
                    );
                }
            } else {
                // Case 2: Vendor created Challan -> Notify Customer (PPC/Store)
                const customerUsers = await this.prisma.user.findMany({
                    where: {
                        organizationId: challan.customerId,
                        role: {
                            in: ['ppc_manager', 'executive', 'production_manager', 'admin']
                        },
                        isActive: true
                    },
                    select: { id: true }
                });

                if (customerUsers.length > 0) {
                    await this.notificationsService.createSystemNotification(
                        challan.customerId,
                        'challan_created',
                        'New Delivery Challan',
                        `Challan ${challan.challanNumber} has been issued by ${challan.vendor.companyName}.`,
                        customerUsers.map(u => u.id),
                        {
                            severity: 'medium',
                            entityType: 'challan',
                            entityId: challan.id,
                            actionUrl: `/dashboard/dispatch/challans/${challan.id}`
                        }
                    );
                }
            }
        } catch (error) {
            console.error('Failed to send notification for challan creation:', error);
            // Don't fail the request if notification fails
        }


        return challan;
    }

    async findAll(
        page: number = 1,
        limit: number = 20,
        customerId?: string,
        vendorId?: string,
        status?: ChallanStatus,
        search?: string
    ) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (customerId) {
            where.customerId = customerId;
        }

        if (vendorId) {
            where.vendorId = vendorId;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { challanNumber: { contains: search, mode: 'insensitive' as const } },
                { vehicleNumber: { contains: search, mode: 'insensitive' as const } }
            ];
        }

        const [challans, total] = await Promise.all([
            this.prisma.deliveryChallan.findMany({
                where,
                skip,
                take: limit,
                orderBy: { challanDate: 'desc' },
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
                    createdBy: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    },
                    _count: {
                        select: {
                            items: true
                        }
                    }
                }
            }),
            this.prisma.deliveryChallan.count({ where })
        ]);

        return {
            data: challans,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findOne(id: string) {
        const challan = await this.prisma.deliveryChallan.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        companyName: true,
                        gstin: true,
                        address: true,
                        city: true,
                        state: true
                    }
                },
                vendor: {
                    select: {
                        id: true,
                        vendorCode: true,
                        companyName: true,
                        gstin: true,
                        address: true,
                        city: true,
                        state: true
                    }
                },
                items: {
                    include: {
                        jobProcesses: {
                            select: {
                                id: true,
                                processName: true,
                                status: true,
                                completedQuantity: true,
                                rejectedQuantity: true
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
                },
                organization: {
                    select: {
                        name: true,
                        gstin: true,
                        address: true,
                        city: true,
                        state: true,
                        pincode: true
                    }
                }
            }
        });

        if (!challan) {
            throw new NotFoundException(`Challan with ID ${id} not found`);
        }

        return challan;
    }

    async update(id: string, updateChallanDto: UpdateChallanDto) {
        await this.findOne(id);

        return this.prisma.deliveryChallan.update({
            where: { id },
            data: updateChallanDto,
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
                items: true
            }
        });
    }

    async updateStatus(id: string, status: ChallanStatus) {
        await this.findOne(id);

        return this.prisma.deliveryChallan.update({
            where: { id },
            data: { status }
        });
    }

    async remove(id: string) {
        const challan = await this.findOne(id);

        // Check if any items have job processes
        const itemsWithProcesses = await this.prisma.challanItem.count({
            where: {
                challanId: id,
                jobProcesses: {
                    some: {}
                }
            }
        });

        if (itemsWithProcesses > 0) {
            throw new BadRequestException('Cannot delete challan with active job processes');
        }

        await this.prisma.deliveryChallan.delete({
            where: { id }
        });

        return { message: 'Challan deleted successfully' };
    }
}
