import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
    constructor(private prisma: PrismaService) { }

    private async generateInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.prisma.invoice.count();
        const sequence = String(count + 1).padStart(4, '0');
        return `INV/${year}/${sequence}`;
    }

    private calculateGST(amount: number, vendorState: string, customerState: string) {
        const gstRate = 0.18;
        if (vendorState === customerState) {
            return { cgst: (amount * gstRate) / 2, sgst: (amount * gstRate) / 2, igst: 0 };
        }
        return { cgst: 0, sgst: 0, igst: amount * gstRate };
    }

    /**
     * OPTIMISED create — resolves N+1 loop (was ~500 queries per invoice with 10 items).
     *
     * Old approach: for each item → findMany challans, then for each challan → findMany invoiceItems
     * New approach: 3 queries total regardless of how many items or challans exist
     *   Q1 — vendor + customer (parallel)
     *   Q2 — all relevant challans for this vendor with their items in one shot
     *   Q3 — all already-invoiced quantities per (challanId, partNumber) in one shot
     */
    async create(createInvoiceDto: CreateInvoiceDto, createdById: string) {
        const { items, vendorId, customerId, ...invoiceData } = createInvoiceDto;

        const partNumbers = items.map(i => i.partNumber);

        // ── Q1 — vendor + customer (parallel) ─────────────────────────────
        const [vendor, customer] = await Promise.all([
            this.prisma.vendor.findUnique({
                where: { id: vendorId },
                select: { id: true, state: true },
            }),
            this.prisma.customer.findUnique({
                where: { id: customerId },
                select: { id: true, state: true },
            }),
        ]);

        if (!vendor || !customer) throw new NotFoundException('Vendor or Customer not found');

        // ── Q2 — all challans for this vendor that contain any requested part ──
        const allChallans = await this.prisma.deliveryChallan.findMany({
            where: {
                vendorId,
                items: { some: { partNumber: { in: partNumbers } } },
            },
            select: {
                id: true,
                challanDate: true,
                items: {
                    where: { partNumber: { in: partNumbers } },
                    select: { id: true, partNumber: true, quantityIssued: true },
                },
            },
            orderBy: { challanDate: 'asc' }, // FIFO
        });

        // ── Q3 — all already-approved invoiced qty per (challanId, partNumber) ──
        const usedInvoiceItems = await this.prisma.invoiceItem.findMany({
            where: {
                challan: { vendorId },
                partNumber: { in: partNumbers },
                invoice: { status: 'approved' },
            },
            select: { challanId: true, partNumber: true, quantity: true },
        });

        // Build a lookup map: `${challanId}::${partNumber}` → usedQty
        const usedMap = new Map<string, number>();
        for (const ui of usedInvoiceItems) {
            const key = `${ui.challanId}::${ui.partNumber}`;
            usedMap.set(key, (usedMap.get(key) ?? 0) + ui.quantity);
        }

        // ── Allocate FIFO in-memory (zero additional DB queries) ──────────
        const invoiceItemsToCreate: {
            challanId: string;
            partNumber: string;
            description: string;
            quantity: number;
            rate: number;
            amount: number;
        }[] = [];
        let totalAmount = 0;

        for (const item of items) {
            let remaining = item.quantity;

            for (const challan of allChallans) {
                if (remaining <= 0) break;
                for (const ci of challan.items) {
                    if (ci.partNumber !== item.partNumber || remaining <= 0) continue;

                    const key       = `${challan.id}::${ci.partNumber}`;
                    const usedQty   = usedMap.get(key) ?? 0;
                    const available = ci.quantityIssued - usedQty;
                    if (available <= 0) continue;

                    const allocate = Math.min(remaining, available);
                    invoiceItemsToCreate.push({
                        challanId:   challan.id,
                        partNumber:  item.partNumber,
                        description: item.description,
                        quantity:    allocate,
                        rate:        item.rate,
                        amount:      allocate * item.rate,
                    });

                    // Prevent double-counting within the same invoice
                    usedMap.set(key, usedQty + allocate);
                    remaining -= allocate;
                }
            }

            if (remaining > 0) {
                throw new BadRequestException(
                    `Insufficient challan balance for part ${item.partNumber}. ` +
                    `Requested: ${item.quantity}, Shortage: ${remaining}`,
                );
            }

            totalAmount += item.quantity * item.rate;
        }

        const gst           = this.calculateGST(totalAmount, vendor.state ?? '', customer.state ?? '');
        const grandTotal    = totalAmount + gst.cgst + gst.sgst + gst.igst;
        const invoiceNumber = await this.generateInvoiceNumber();

        return this.prisma.invoice.create({
            data: {
                ...invoiceData,
                invoiceNumber,
                vendor:      { connect: { id: vendorId } },
                customer:    { connect: { id: customerId } },
                invoiceDate: new Date(createInvoiceDto.invoiceDate),
                dueDate:     createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : null,
                totalAmount,
                cgstAmount:  gst.cgst,
                sgstAmount:  gst.sgst,
                igstAmount:  gst.igst,
                grandTotal,
                status:      InvoiceStatus.draft,
                createdBy:   createdById ? { connect: { id: createdById } } : undefined,
                items:       { create: invoiceItemsToCreate },
            },
            include: { items: true },
        });
    }

    async findAll(page: number = 1, limit: number = 20, vendorId?: string, status?: InvoiceStatus) {
        const skip  = (page - 1) * limit;
        const where: any = {};
        if (vendorId) where.vendorId = vendorId;
        if (status)   where.status   = status;

        const [invoices, total] = await Promise.all([
            this.prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { invoiceDate: 'desc' },
                select: {
                    id: true,
                    invoiceNumber: true,
                    invoiceType: true,
                    invoiceDate: true,
                    dueDate: true,
                    totalAmount: true,
                    grandTotal: true,
                    status: true,
                    createdAt: true,
                    vendor:   { select: { id: true, vendorCode: true, companyName: true } },
                    customer: { select: { id: true, companyName: true } },
                    _count:   { select: { items: true } },
                },
            }),
            this.prisma.invoice.count({ where }),
        ]);

        return {
            data: invoices,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: string) {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id },
            include: {
                vendor:   true,
                customer: true,
                items: {
                    include: { challan: { select: { challanNumber: true } } },
                },
                createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });
        if (!invoice) throw new NotFoundException(`Invoice with ID ${id} not found`);
        return invoice;
    }

    async update(id: string, updateInvoiceDto: UpdateInvoiceDto) {
        await this.findOne(id);
        const { customerId, vendorId, ...rest } = updateInvoiceDto;
        return this.prisma.invoice.update({
            where: { id },
            data: {
                ...rest,
                customer: customerId ? { connect: { id: customerId } } : undefined,
                vendor:   vendorId   ? { connect: { id: vendorId } }   : undefined,
            },
        });
    }

    async finalize(id: string) {
        await this.findOne(id);
        return this.prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.submitted } });
    }

    async updateStatus(id: string, status: InvoiceStatus) {
        await this.findOne(id);
        return this.prisma.invoice.update({ where: { id }, data: { status } });
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.invoice.delete({ where: { id } });
        return { message: 'Invoice deleted successfully' };
    }
}
