import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export interface CreateVendorInvoiceDto {
    invoiceNumber: string;
    invoiceDate: Date;
    customerId: string;
    remarks?: string;
    items: CreateVendorInvoiceItemDto[];
}

export interface CreateVendorInvoiceItemDto {
    challanItemId: string;
    invoiceQuantity: number;
    unitPrice?: number; // Optional override — used when no PO rate is set
    operationName?: string; // Which machining operation is being billed (e.g. Turning, VMC)
}

export interface UpdateVendorInvoiceItemDto {
    id: string; // existing VendorInvoiceItem id
    invoiceQuantity: number;
    unitPrice: number;
}

export interface UpdateVendorInvoiceDto {
    invoiceNumber?: string;
    invoiceDate?: string | Date;
    remarks?: string;
    items?: UpdateVendorInvoiceItemDto[];
}

export interface GSTCalculation {
    isInterState: boolean;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
}

@Injectable()
export class VendorInvoiceService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    /**
     * Get challans available for invoicing by vendor
     */
    async getAvailableChallans(vendorId: string) {
        const challans = await this.prisma.deliveryChallan.findMany({
            where: {
                vendorId,
                status: { in: ['issued', 'received'] }
            },
            include: {
                customer: true,
                items: {
                    include: {
                        vendorInvoiceItems: true
                    }
                }
            },
            orderBy: {
                challanDate: 'desc'
            }
        });

        // Filter challans that have uninvoiced items
        return challans.filter(challan => {
            return challan.items.some(item => {
                const invoicedQty = item.vendorInvoiceItems.reduce(
                    (sum, inv) => sum + inv.invoiceQuantity,
                    0
                );
                return invoicedQty < item.quantityIssued;
            });
        });
    }

    /**
     * Get challan details with available quantities for invoicing
     */
    async getChallanDetails(challanId: string, vendorId: string) {
        const challan = await this.prisma.deliveryChallan.findFirst({
            where: {
                id: challanId,
                vendorId
            },
            include: {
                customer: true,
                vendor: true,
                items: {
                    include: {
                        vendorInvoiceItems: true,
                        poItem: true
                    }
                }
            }
        });

        if (!challan) {
            throw new NotFoundException('Challan not found');
        }

        // Calculate available quantities
        const itemsWithAvailability = challan.items.map(item => {
            const invoicedQty = item.vendorInvoiceItems.reduce(
                (sum, inv) => sum + inv.invoiceQuantity,
                0
            );
            const availableQty = item.quantityIssued - invoicedQty;

            // Fetch rate from linked PO item if available, otherwise fallback to challan unit price or 0
            const rate = item.poItem?.ratePerPiece ?? item.unitPrice ?? 0;

            return {
                ...item,
                invoicedQty,
                availableQty,
                rate
            };
        });

        return {
            ...challan,
            items: itemsWithAvailability
        };
    }

    /**
     * Create vendor invoice
     */
    async createInvoice(vendorId: string, data: CreateVendorInvoiceDto) {
        // Get vendor and customer details
        const vendor = await this.prisma.vendor.findUnique({
            where: { id: vendorId }
        });

        const customer = await this.prisma.customer.findUnique({
            where: { id: data.customerId }
        });

        if (!vendor || !customer) {
            throw new BadRequestException('Vendor or customer not found');
        }

        // Validate and prepare invoice items
        const invoiceItems = [];
        let subtotal = 0;

        for (const itemDto of data.items) {
            const challanItem = await this.prisma.challanItem.findUnique({
                where: { id: itemDto.challanItemId },
                include: {
                    vendorInvoiceItems: true,
                    challan: true,
                    poItem: true
                }
            });

            if (!challanItem) {
                throw new BadRequestException(`Challan item ${itemDto.challanItemId} not found`);
            }

            // Check if challan belongs to vendor
            if (challanItem.challan.vendorId !== vendorId) {
                throw new BadRequestException('Challan does not belong to vendor');
            }

            // Calculate already invoiced quantity
            const invoicedQty = challanItem.vendorInvoiceItems.reduce(
                (sum, inv) => sum + inv.invoiceQuantity,
                0
            );

            const availableQty = challanItem.quantityIssued - invoicedQty;

            // Validate invoice quantity
            if (itemDto.invoiceQuantity <= 0) {
                throw new BadRequestException('Invoice quantity must be greater than 0');
            }

            if (itemDto.invoiceQuantity > availableQty) {
                throw new BadRequestException(
                    `Invoice quantity ${itemDto.invoiceQuantity} exceeds available quantity ${availableQty} for item ${challanItem.partNumber}`
                );
            }

            // Priority: manual override from frontend > PO item rate > challan unit price > 0
            const unitPrice = (itemDto.unitPrice && itemDto.unitPrice > 0)
                ? itemDto.unitPrice
                : (challanItem.poItem?.ratePerPiece ?? challanItem.unitPrice ?? 0);
            const amount = itemDto.invoiceQuantity * unitPrice;
            const hsnCode = challanItem.poItem?.hsnCode ?? challanItem.hsnCode;

            // Resolve operationName: use provided value, or pull first operation from the linked PO item
            const operationName = itemDto.operationName
                ?? (challanItem.poItem?.operations?.length ? challanItem.poItem.operations[0] : null);

            // Calculate GST
            const gst = this.calculateGST(
                vendor.gstin,
                customer.gstin,
                amount
            );

            const totalAmount = amount + gst.cgstAmount + gst.sgstAmount + gst.igstAmount;

            invoiceItems.push({
                challanItemId: itemDto.challanItemId,
                partNumber: challanItem.partNumber,
                partDescription: challanItem.partDescription,
                operationName,
                hsnCode,
                challanQuantity: challanItem.quantityIssued,
                invoiceQuantity: itemDto.invoiceQuantity,
                unitPrice,
                amount,
                cgstRate: gst.cgstRate,
                cgstAmount: gst.cgstAmount,
                sgstRate: gst.sgstRate,
                sgstAmount: gst.sgstAmount,
                igstRate: gst.igstRate,
                igstAmount: gst.igstAmount,
                totalAmount
            });

            subtotal += amount;
        }

        // Calculate total GST
        const totalCgst = invoiceItems.reduce((sum, item) => sum + item.cgstAmount, 0);
        const totalSgst = invoiceItems.reduce((sum, item) => sum + item.sgstAmount, 0);
        const totalIgst = invoiceItems.reduce((sum, item) => sum + item.igstAmount, 0);
        const totalAmount = subtotal + totalCgst + totalSgst + totalIgst;

        // Determine if inter-state
        const vendorState = vendor.gstin?.substring(0, 2);
        const customerState = customer.gstin?.substring(0, 2);
        const isInterState = vendorState !== customerState;

        // Create invoice
        const invoice = await this.prisma.vendorInvoice.create({
            data: {
                invoiceNumber: data.invoiceNumber,
                invoiceDate: data.invoiceDate,
                vendorId,
                customerId: data.customerId,
                subtotal,
                cgst: totalCgst,
                sgst: totalSgst,
                igst: totalIgst,
                totalAmount,
                vendorGstin: vendor.gstin,
                customerGstin: customer.gstin,
                placeOfSupply: customer.state,
                isInterState,
                balanceAmount: totalAmount,
                remarks: data.remarks,
                items: {
                    create: invoiceItems
                }
            },
            include: {
                items: true,
                vendor: true,
                customer: true
            }
        });

        return invoice;
    }

    /**
     * Calculate GST amounts
     */
    private calculateGST(vendorGstin: string | null, customerGstin: string | null, amount: number): GSTCalculation {
        const vendorState = vendorGstin?.substring(0, 2);
        const customerState = customerGstin?.substring(0, 2);
        const isInterState = vendorState !== customerState;

        const gstRate = 18; // Default GST rate, can be made configurable per HSN code

        if (isInterState) {
            return {
                isInterState: true,
                cgstRate: 0,
                cgstAmount: 0,
                sgstRate: 0,
                sgstAmount: 0,
                igstRate: gstRate,
                igstAmount: (amount * gstRate) / 100
            };
        } else {
            const halfRate = gstRate / 2;
            return {
                isInterState: false,
                cgstRate: halfRate,
                cgstAmount: (amount * halfRate) / 100,
                sgstRate: halfRate,
                sgstAmount: (amount * halfRate) / 100,
                igstRate: 0,
                igstAmount: 0
            };
        }
    }

    /**
     * Get vendor invoices with filters
     */
    async getInvoices(vendorId?: string, filters?: {
        status?: InvoiceStatus;
        customerId?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const where: any = {};

        if (vendorId) {
            where.vendorId = vendorId;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        if (filters?.startDate || filters?.endDate) {
            where.invoiceDate = {};
            if (filters.startDate) {
                where.invoiceDate.gte = filters.startDate;
            }
            if (filters.endDate) {
                where.invoiceDate.lte = filters.endDate;
            }
        }

        return this.prisma.vendorInvoice.findMany({
            where,
            include: {
                vendor: true,
                customer: true,
                items: true
            },
            orderBy: {
                invoiceDate: 'desc'
            }
        });
    }

    /**
     * Get invoice by ID
     */
    async getInvoiceById(id: string, vendorId: string) {
        const invoice = await this.prisma.vendorInvoice.findFirst({
            where: {
                id,
                vendorId
            },
            include: {
                vendor: true,
                customer: true,
                items: {
                    include: {
                        challanItem: {
                            include: {
                                challan: true
                            }
                        }
                    }
                }
            }
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        return invoice;
    }

    /**
     * Update draft invoice
     */
    async updateInvoice(id: string, vendorId: string, data: UpdateVendorInvoiceDto) {
        const invoice = await this.getInvoiceById(id, vendorId);

        if (!['draft', 'submitted'].includes(invoice.status)) {
            throw new BadRequestException('Invoice can only be edited before security approval');
        }

        // If items are provided, update each item and recalculate totals
        if (data.items && data.items.length > 0) {
            for (const itemUpdate of data.items) {
                const existingItem = (invoice as any).items?.find((i: any) => i.id === itemUpdate.id);
                if (!existingItem) continue;

                const unitPrice = itemUpdate.unitPrice > 0 ? itemUpdate.unitPrice : existingItem.unitPrice;
                const invoiceQuantity = itemUpdate.invoiceQuantity > 0 ? itemUpdate.invoiceQuantity : existingItem.invoiceQuantity;
                const amount = invoiceQuantity * unitPrice;

                const gst = this.calculateGST(
                    (invoice as any).vendor?.gstin ?? null,
                    (invoice as any).customer?.gstin ?? null,
                    amount
                );
                const totalAmount = amount + gst.cgstAmount + gst.sgstAmount + gst.igstAmount;

                await this.prisma.vendorInvoiceItem.update({
                    where: { id: itemUpdate.id },
                    data: {
                        invoiceQuantity,
                        unitPrice,
                        amount,
                        cgstRate: gst.cgstRate,
                        cgstAmount: gst.cgstAmount,
                        sgstRate: gst.sgstRate,
                        sgstAmount: gst.sgstAmount,
                        igstRate: gst.igstRate,
                        igstAmount: gst.igstAmount,
                        totalAmount,
                    }
                });
            }

            // Recalculate invoice totals from updated items
            const updatedItems = await this.prisma.vendorInvoiceItem.findMany({
                where: { invoiceId: id }
            });
            const subtotal = updatedItems.reduce((sum, i) => sum + i.amount, 0);
            const totalCgst = updatedItems.reduce((sum, i) => sum + i.cgstAmount, 0);
            const totalSgst = updatedItems.reduce((sum, i) => sum + i.sgstAmount, 0);
            const totalIgst = updatedItems.reduce((sum, i) => sum + i.igstAmount, 0);
            const newTotal = subtotal + totalCgst + totalSgst + totalIgst;
            const paidAmount = (invoice as any).paidAmount ?? 0;

            return this.prisma.vendorInvoice.update({
                where: { id },
                data: {
                    invoiceNumber: data.invoiceNumber,
                    invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
                    remarks: data.remarks,
                    subtotal,
                    cgst: totalCgst,
                    sgst: totalSgst,
                    igst: totalIgst,
                    totalAmount: newTotal,
                    balanceAmount: newTotal - paidAmount,
                },
                include: {
                    items: true,
                    vendor: true,
                    customer: true
                }
            });
        }

        // No item updates — just update header fields
        return this.prisma.vendorInvoice.update({
            where: { id },
            data: {
                invoiceNumber: data.invoiceNumber,
                invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
                remarks: data.remarks
            },
            include: {
                items: true,
                vendor: true,
                customer: true
            }
        });
    }

    /**
     * Submit invoice for approval
     */
    async submitInvoice(id: string, vendorId: string) {
        const invoice = await this.getInvoiceById(id, vendorId);

        if (invoice.status !== 'draft') {
            throw new BadRequestException('Only draft invoices can be submitted');
        }

        const updatedInvoice = await this.prisma.vendorInvoice.update({
            where: { id },
            data: {
                status: 'submitted'
            },
            include: {
                items: true,
                vendor: true,
                customer: true
            }
        });

        // Notify Customer (Accounts, Executive, Admin)
        try {
            const customerUsers = await this.prisma.user.findMany({
                where: {
                    organizationId: updatedInvoice.customerId,
                    role: {
                        in: ['admin', 'executive', 'director', 'gm'] // Accounts role doesn't exist yet, targeting execs
                    },
                    isActive: true
                },
                select: { id: true }
            });

            if (customerUsers.length > 0) {
                await this.notificationsService.createSystemNotification(
                    updatedInvoice.customerId,
                    'invoice_submitted',
                    'Invoice Submitted',
                    `Invoice ${updatedInvoice.invoiceNumber} has been submitted by ${updatedInvoice.vendor.companyName} for ₹${updatedInvoice.totalAmount.toLocaleString()}.`,
                    customerUsers.map(u => u.id),
                    {
                        severity: 'medium',
                        entityType: 'invoice',
                        entityId: updatedInvoice.id,
                        actionUrl: `/dashboard/executive/invoices`
                    }
                );
            }
        } catch (error) {
            console.error('Failed to send invoice submission notification:', error);
        }

        return updatedInvoice;
    }

    /**
     * Delete draft invoice
     */
    async deleteInvoice(id: string, vendorId: string) {
        const invoice = await this.getInvoiceById(id, vendorId);

        if (invoice.status !== 'draft') {
            throw new BadRequestException('Only draft invoices can be deleted');
        }

        await this.prisma.vendorInvoice.delete({
            where: { id }
        });

        return { message: 'Invoice deleted successfully' };
    }

    /**
     * Gate-approve invoice (security verifies physical delivery)
     */
    async gateApproveInvoice(
        id: string,
        userId: string,
        items: { itemId: string; gateReceivedQty: number; gateRemarks?: string }[],
        gateRemarks?: string,
    ) {
        const invoice = await this.prisma.vendorInvoice.findUnique({
            where: { id },
            include: { items: true, vendor: true, customer: true },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'submitted') {
            throw new BadRequestException('Only submitted invoices can be gate-approved');
        }

        // Update each item's received qty
        await Promise.all(
            items.map(item =>
                this.prisma.vendorInvoiceItem.update({
                    where: { id: item.itemId },
                    data: {
                        gateReceivedQty: item.gateReceivedQty,
                        gateRemarks: item.gateRemarks ?? null,
                    },
                }),
            ),
        );

        // Transition invoice to gate_approved
        const updatedInvoice = await this.prisma.vendorInvoice.update({
            where: { id },
            data: {
                status: 'gate_approved',
                gateApprovedById: userId,
                gateApprovedAt: new Date(),
                gateRemarks: gateRemarks ?? null,
            },
            include: { items: true, vendor: true, customer: true },
        });

        // ── Auto-generate Material Receipt (GRN) ──
        try {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const startOfMonth = new Date(year, date.getMonth(), 1);

            const count = await this.prisma.materialReceipt.count({
                where: {
                    receiptDate: { gte: startOfMonth },
                    organizationId: invoice.customer.organizationId
                }
            });
            const seq = String(count + 1).padStart(3, '0');
            const receiptNumber = `GRN/${year}/${month}/${seq}`;

            await this.prisma.materialReceipt.create({
                data: {
                    organizationId: invoice.customer.organizationId,
                    receiptNumber,
                    receiptDate: date,
                    vendorId: invoice.vendorId,
                    receivedById: userId,
                    status: 'accepted',
                    remarks: `Auto-generated from Vendor Invoice ${invoice.invoiceNumber}${gateRemarks ? ' - ' + gateRemarks : ''}`,
                    items: {
                        create: updatedInvoice.items
                            .filter(item => !!item.challanItemId)
                            .map(item => ({
                                challanItemId: item.challanItemId as string,
                                expectedQty: item.invoiceQuantity,
                                receivedQty: item.gateReceivedQty ?? item.invoiceQuantity,
                                shortQty: Math.max(0, item.invoiceQuantity - (item.gateReceivedQty ?? item.invoiceQuantity)),
                                excessQty: 0,
                                remarks: item.gateRemarks ?? null
                            }))
                    }
                }
            });
        } catch (e) {
            console.error('Failed to auto-generate GRN for invoice:', e);
        }

        // Notify PPC managers
        try {
            const ppcUsers = await this.prisma.user.findMany({
                where: {
                    organizationId: invoice.customerId,
                    role: { in: ['ppc_manager', 'admin', 'director', 'gm'] },
                    isActive: true,
                },
                select: { id: true },
            });
            if (ppcUsers.length > 0) {
                await this.notificationsService.createSystemNotification(
                    invoice.customerId,
                    'invoice_gate_approved',
                    'Invoice Gate-Approved',
                    `Invoice ${invoice.invoiceNumber} from ${invoice.vendor.companyName} has been physically verified at the gate. Pending PPC approval.`,
                    ppcUsers.map(u => u.id),
                    { severity: 'medium', entityType: 'invoice', entityId: id, actionUrl: `/dashboard/vendor-invoices` },
                );
            }
        } catch (e) {
            console.error('Failed to send gate-approval notification:', e);
        }

        return updatedInvoice;
    }

    /**
     * Approve invoice
     */
    async approveInvoice(id: string, userId: string) {
        // Find the invoice (we don't constrain by vendorId since OEM staff is approving)
        const invoice = await this.prisma.vendorInvoice.findUnique({
            where: { id },
            include: {
                vendor: true,
                customer: true
            }
        });

        if (!invoice) {
            throw new NotFoundException('Invoice not found');
        }

        if (invoice.status !== 'gate_approved') {
            throw new BadRequestException('Invoice must be gate-approved before PPC approval');
        }

        // Update the status to approved
        const updatedInvoice = await this.prisma.vendorInvoice.update({
            where: { id },
            data: { status: 'approved' },
            include: {
                items: {
                    include: {
                        challanItem: {
                            include: { jobProcesses: true }
                        }
                    }
                },
                vendor: true,
                customer: true
            }
        });

        /**
         * Auto-update JobProcess WIP when invoice is approved
         *
         * For each invoice line item:
         * 1. Find the JobProcess on the ChallanItem whose processName matches the operationName
         * 2. If the process is still 'pending', mark it 'in_progress' with the invoiced quantity as completedQuantity
         * 3. If 'in_progress', add to completedQuantity
         * This makes the executive dashboard's part stage calculation reflect reality in real time.
         */
        for (const item of updatedInvoice.items) {
            if (!item.operationName || !item.challanItem) continue;

            const matchingProcess = item.challanItem.jobProcesses.find(
                p => p.processName.toLowerCase() === item.operationName.toLowerCase()
            );

            if (matchingProcess) {
                const newCompleted = Math.min(
                    matchingProcess.completedQuantity + item.invoiceQuantity,
                    matchingProcess.targetQuantity ?? item.invoiceQuantity
                );
                const allCompleted = matchingProcess.targetQuantity
                    ? newCompleted >= matchingProcess.targetQuantity
                    : false;

                await this.prisma.jobProcess.update({
                    where: { id: matchingProcess.id },
                    data: {
                        status: allCompleted ? 'completed' : 'in_progress',
                        completedQuantity: newCompleted,
                        startedAt: matchingProcess.startedAt ?? new Date(),
                        completedAt: allCompleted ? new Date() : null
                    }
                });
            }
        }

        /**
         * Auto-close challan when all items are fully invoiced and approved.
         *
         * For each challan linked to this invoice's items:
         * - Load all its ChallanItems with their vendorInvoiceItems (approved only)
         * - If every item's approved invoiced qty >= issued qty → mark challan 'received'
         * This keeps the "material at vendor" count accurate for PPC and stock statements.
         */
        try {
            // Collect unique challan IDs from this invoice's items
            const challanIds = [...new Set(
                updatedInvoice.items
                    .map((item: any) => item.challanItem?.challanId)
                    .filter(Boolean)
            )];

            for (const challanId of challanIds) {
                const challan = await this.prisma.deliveryChallan.findUnique({
                    where: { id: challanId as string },
                    include: {
                        items: {
                            include: {
                                vendorInvoiceItems: {
                                    include: { invoice: { select: { status: true } } }
                                }
                            }
                        }
                    }
                });

                if (!challan || challan.status === 'received' || challan.status === 'closed') continue;

                const allFullyInvoiced = challan.items.every(item => {
                    const approvedQty = item.vendorInvoiceItems
                        .filter((inv: any) => inv.invoice.status === 'approved')
                        .reduce((sum: number, inv: any) => sum + inv.invoiceQuantity, 0);
                    return approvedQty >= item.quantityIssued;
                });

                if (allFullyInvoiced) {
                    await this.prisma.deliveryChallan.update({
                        where: { id: challanId as string },
                        data: { status: 'received' }
                    });
                }
            }
        } catch (err) {
            console.error('Auto-close challan check failed:', err);
        }

        // Notify Vendor
        try {
            const vendorUsers = await this.prisma.user.findMany({
                where: {
                    vendorId: updatedInvoice.vendorId,
                    isActive: true
                },
                select: { id: true }
            });

            if (vendorUsers.length > 0) {
                await this.notificationsService.createSystemNotification(
                    updatedInvoice.vendor.organizationId,
                    'invoice_approved',
                    'Invoice Approved',
                    `Your invoice ${updatedInvoice.invoiceNumber} for ₹${updatedInvoice.totalAmount.toLocaleString()} has been approved.`,
                    vendorUsers.map(u => u.id),
                    {
                        severity: 'low',
                        entityType: 'invoice',
                        entityId: updatedInvoice.id,
                        actionUrl: `/dashboard/vendor/invoices`
                    }
                );
            }
        } catch (error) {
            console.error('Failed to send invoice approval notification:', error);
        }

        return updatedInvoice;
    }
}
