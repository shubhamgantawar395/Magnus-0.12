import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { POStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PurchaseOrdersService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(createPurchaseOrderDto: CreatePurchaseOrderDto, userId: string, organizationId: string) {
        const { items, ...poData } = createPurchaseOrderDto;

        // Generate PO Number if not provided
        let poNumber = poData.poNumber;
        if (!poNumber) {
            poNumber = await this.generatePoNumber(organizationId);
        }

        // Calculate Totals
        const { subtotal, cgst, sgst, igst, totalAmount } = this.calculateTotals(items, organizationId); // Simplification: assuming intra-state for now or handling later

        // Create PO with Items transaction
        const po = await this.prisma.purchaseOrder.create({
            data: {
                ...poData,
                poNumber,
                organizationId,
                createdById: userId,
                subtotal,
                cgst,
                sgst,
                igst,
                totalAmount,
                status: POStatus.draft,
                items: {
                    create: items.map(item => ({
                        partNumber: item.partNumber,
                        partDescription: item.partDescription || null,
                        hsnCode: item.hsnCode || null,
                        drawingNumber: item.drawingNumber || null,
                        quantity: item.quantity,
                        unitOfMeasure: item.unitOfMeasure || 'NOS',
                        operations: item.operations || [],
                        ratePerPiece: item.ratePerPiece,
                        amount: item.quantity * item.ratePerPiece,
                        materialGrade: item.materialGrade || null,
                        materialCost: item.materialCost || 0,
                        deliverySchedule: item.deliverySchedule ? new Date(item.deliverySchedule) : null,
                    }))
                }
            },
            include: {
                items: true,
                vendor: true
            }
        });

        // Trigger High-Value Alert if > 50,000
        if (totalAmount > 50000) {
            const execs = await this.prisma.user.findMany({
                where: { organizationId, role: { in: ['director', 'gm'] as any }, isActive: true },
                select: { id: true }
            });
            if (execs.length > 0) {
                await this.notificationsService.createSystemNotification(
                    organizationId,
                    'high_value_po',
                    'High Value PO Alert',
                    `A PO ${po.poNumber} with value ₹${totalAmount.toLocaleString()} has been created and requires review.`,
                    execs.map(e => e.id),
                    { severity: 'high', entityType: 'po', entityId: po.id, actionUrl: `/dashboard/purchase-orders/${po.id}` }
                );
            }
        }

        return po;
    }

    async findAll(
        organizationId: string,
        filters?: { status?: POStatus; vendorId?: string },
        page = 1,
        limit = 50,
    ) {
        const skip = (page - 1) * limit;
        const where = { organizationId, ...filters };

        const [data, total] = await Promise.all([
            this.prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
                // Use select instead of include — avoids loading all vendor columns
                select: {
                    id: true,
                    poNumber: true,
                    poDate: true,
                    deliveryDate: true,
                    status: true,
                    jobWorkType: true,
                    subtotal: true,
                    totalAmount: true,
                    createdAt: true,
                    vendor: {
                        select: { id: true, companyName: true, vendorCode: true },
                    },
                    createdBy: {
                        select: { firstName: true, lastName: true },
                    },
                    items: {
                        select: { partNumber: true, partDescription: true, quantity: true, ratePerPiece: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.purchaseOrder.count({ where }),
        ]);

        return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: string, organizationId: string) {
        const po = await this.prisma.purchaseOrder.findFirst({
            where: { id, organizationId },
            include: {
                items: true,
                vendor: true,
                organization: true,
                createdBy: { select: { firstName: true, lastName: true, email: true, phone: true } },
                approvedBy: { select: { firstName: true, lastName: true } }
            }
        });

        if (!po) throw new NotFoundException('Purchase Order not found');
        return po;
    }

    async update(id: string, updatePurchaseOrderDto: UpdatePurchaseOrderDto, organizationId: string) {
        const po = await this.findOne(id, organizationId);

        if (po.status !== POStatus.draft) {
            throw new BadRequestException('Only draft POs can be edited');
        }

        const { items, vendorId, ...data } = updatePurchaseOrderDto;

        // Recalculate totals if items provided
        let totalsData = {};
        if (items && items.length > 0) {
            const totals = this.calculateTotals(items, organizationId);
            totalsData = {
                subtotal: totals.subtotal,
                cgst: totals.cgst,
                sgst: totals.sgst,
                igst: totals.igst,
                totalAmount: totals.totalAmount,
            };
        }

        return this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                ...data,
                ...totalsData,
                ...(items && items.length > 0 ? {
                    items: {
                        deleteMany: {},
                        create: items.map((item: any) => ({
                            partNumber: item.partNumber,
                            partDescription: item.partDescription || null,
                            hsnCode: item.hsnCode || null,
                            drawingNumber: item.drawingNumber || null,
                            quantity: item.quantity,
                            unitOfMeasure: item.unitOfMeasure || 'NOS',
                            operations: item.operations || [],
                            ratePerPiece: item.ratePerPiece,
                            amount: item.quantity * item.ratePerPiece,
                            materialGrade: item.materialGrade || null,
                            materialCost: item.materialCost || 0,
                        }))
                    }
                } : {})
            },
            include: { items: true, vendor: true }
        });
    }

    async remove(id: string, organizationId: string) {
        const po = await this.findOne(id, organizationId);
        if (po.status !== POStatus.draft) {
            throw new BadRequestException('Only draft POs can be deleted');
        }
        return this.prisma.purchaseOrder.delete({ where: { id } });
    }

    // Approval Workflow
    async submit(id: string, organizationId: string) {
        const po = await this.findOne(id, organizationId);
        if (po.status !== POStatus.draft) {
            throw new BadRequestException('Only draft POs can be submitted for approval');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: POStatus.pending_approval }
        });
    }

    async approve(id: string, userId: string, organizationId: string, remarks?: string) {
        const po = await this.findOne(id, organizationId);
        if (po.status !== POStatus.pending_approval) {
            throw new BadRequestException('PO is not pending approval');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: POStatus.approved,
                approvedById: userId,
                approvedAt: new Date(),
                remarks: remarks ? `${po.remarks || ''}\n[Approval]: ${remarks}` : po.remarks
            }
        });
    }

    async reject(id: string, userId: string, organizationId: string, reason: string) {
        const po = await this.findOne(id, organizationId);
        if (po.status !== POStatus.pending_approval) {
            throw new BadRequestException('PO is not pending approval');
        }
        return this.prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: POStatus.rejected,
                // We don't set approvedById for rejection, but we track the reason
                rejectionReason: reason
            }
        });
    }

    // Helper: Generate PO Number
    private async generatePoNumber(organizationId: string): Promise<string> {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        // Get count for this month
        const count = await this.prisma.purchaseOrder.count({
            where: {
                organizationId,
                createdAt: {
                    gte: new Date(year, date.getMonth(), 1),
                    lt: new Date(year, date.getMonth() + 1, 1)
                }
            }
        });

        // Get org code for scoping
        const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
        const prefix = org?.code || 'PO';

        const sequence = String(count + 1).padStart(3, '0');
        return `${prefix}/${year}/${month}/${sequence}`;
    }

    // Helper: Calculate Totals
    private calculateTotals(items: any[], organizationId: string) {
        let subtotal = 0;
        items.forEach(item => {
            subtotal += item.quantity * item.ratePerPiece;
        });

        // Basic Tax Calculation (Assuming 18% IGST for simplicity as default, can be refined)
        // In real app, we check Vendor State vs Org State
        const taxRate = 0.18;
        const taxAmount = subtotal * taxRate;

        return {
            subtotal,
            cgst: 0,
            sgst: 0,
            igst: taxAmount,
            totalAmount: subtotal + taxAmount
        };
    }
}
