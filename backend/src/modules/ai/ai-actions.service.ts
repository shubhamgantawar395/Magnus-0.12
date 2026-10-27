import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChallansService } from '../challans/challans.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { VendorInvoiceService } from '../vendor-invoices/vendor-invoice.service';

/**
 * Parses and executes action tags from Claude responses.
 * Supported tags:
 *   [ACTION:CREATE_CHALLAN|customerId=X|vendorId=X|partNumber=X|qty=N|date=YYYY-MM-DD]
 *   [ACTION:CREATE_PO|vendorId=X|partNumber=X|qty=N|rate=R|description=X]
 *   [ACTION:ADD_PART|partNumber=X|description=X|capacity=N|unit=X]
 *   [ACTION:UPDATE_DISPATCH|partNumber=X|completedQty=N|challanNumber=X]
 *   [ACTION:CREATE_INVOICE|challanNumber=X]
 *   [ACTION:UPDATE_CHALLAN_STATUS|challanId=X|status=received]
 */
@Injectable()
export class AiActionsService {
    private readonly logger = new Logger(AiActionsService.name);

    // ACTION_TAG_RE matches [ACTION:TYPE|key=value|key=value...]
    private static readonly ACTION_TAG_RE = /\[ACTION:([A-Z_]+)(\|[^\]]+)?\]/;

    constructor(
        private readonly prisma: PrismaService,
        private readonly challansService: ChallansService,
        private readonly purchaseOrdersService: PurchaseOrdersService,
        private readonly vendorInvoiceService: VendorInvoiceService,
    ) { }

    /**
     * Strip action tags from the response text, execute them, and
     * return the cleaned text + execution result appended.
     */
    async processResponse(text: string, user: any): Promise<string> {
        const regex = /\[ACTION:([A-Z_]+)(\|[^\]]+)?\]/g;
        const results: string[] = [];
        let cleanText = text;

        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            const actionType = match[1];
            const paramStr = match[2] ?? '';
            const params = this.parseParams(paramStr);

            // Remove the tag from the response
            cleanText = cleanText.replace(match[0], '').trim();

            try {
                const result = await this.execute(actionType, params, user);
                results.push(result);
            } catch (err: any) {
                this.logger.error(`Action ${actionType} failed: ${err.message}`);
                results.push(`⚠ Could not complete ${actionType}: ${err.message}`);
            }
        }

        if (results.length) {
            return `${cleanText}\n\n${results.join('\n')}`.trim();
        }
        return cleanText;
    }

    private parseParams(paramStr: string): Record<string, string> {
        const params: Record<string, string> = {};
        if (!paramStr) return params;
        for (const segment of paramStr.split('|')) {
            const eqIdx = segment.indexOf('=');
            if (eqIdx > 0) {
                params[segment.slice(0, eqIdx).trim()] = segment.slice(eqIdx + 1).trim();
            }
        }
        return params;
    }

    private async execute(actionType: string, params: Record<string, string>, user: any): Promise<string> {
        switch (actionType) {
            case 'CREATE_CHALLAN':   return this.createChallan(params, user);
            case 'CREATE_PO':        return this.createPO(params, user);
            case 'ADD_PART':         return this.addPart(params, user);
            case 'UPDATE_DISPATCH':  return this.updateDispatch(params, user);
            case 'CREATE_INVOICE':   return this.createInvoice(params, user);
            case 'UPDATE_CHALLAN_STATUS': return this.updateChallanStatus(params, user);
            default:
                return `Unknown action: ${actionType}`;
        }
    }

    // ── CREATE_CHALLAN ──────────────────────────────────────────────────────────
    private async createChallan(params: Record<string, string>, user: any): Promise<string> {
        const orgId = user.organizationId;

        // Resolve customerId — accept direct id or name
        let customerId = params.customerId;
        if (!customerId || customerId.length < 30) {
            const customerName = params.customerName || params.customerId || '';
            const customer = await this.prisma.customer.findFirst({
                where: {
                    organizationId: orgId,
                    companyName: { contains: customerName, mode: 'insensitive' },
                },
                select: { id: true, companyName: true },
            });
            if (!customer) throw new Error(`Customer "${customerName}" not found`);
            customerId = customer.id;
        }

        // Resolve vendorId
        let vendorId = params.vendorId;
        if (!vendorId || vendorId.length < 30) {
            const vendorName = params.vendorName || params.vendorId || '';
            const vendor = await this.prisma.vendor.findFirst({
                where: {
                    isActive: true,
                    companyName: { contains: vendorName, mode: 'insensitive' },
                    OR: [
                        { organizationId: orgId },
                        { customer: { organizationId: orgId } },
                    ],
                },
                select: { id: true, companyName: true },
            });
            if (!vendor) throw new Error(`Vendor "${vendorName}" not found`);
            vendorId = vendor.id;
        }

        const partNumber = params.partNumber;
        const qty = parseInt(params.qty || '0', 10);
        if (!partNumber || qty < 1) throw new Error('partNumber and qty are required');

        const challanDate = params.date || new Date().toISOString().slice(0, 10);

        const dto = {
            customerId,
            vendorId,
            challanDate,
            items: [{
                partNumber,
                quantityIssued: qty,
                partDescription: params.description || partNumber,
                unitOfMeasure: params.unit || 'NOS',
            }],
        };

        const result = await this.challansService.create(dto as any, user.id);
        return `✓ Challan created: ${(result as any).challanNumber} — ${qty}× ${partNumber} dispatched to vendor. View in Admin → Challans.`;
    }

    // ── CREATE_PO ───────────────────────────────────────────────────────────────
    private async createPO(params: Record<string, string>, user: any): Promise<string> {
        const orgId = user.organizationId;

        let vendorId = params.vendorId;
        if (!vendorId || vendorId.length < 30) {
            const vendorName = params.vendorName || params.vendorId || '';
            const vendor = await this.prisma.vendor.findFirst({
                where: {
                    isActive: true,
                    companyName: { contains: vendorName, mode: 'insensitive' },
                    OR: [{ organizationId: orgId }, { customer: { organizationId: orgId } }],
                },
                select: { id: true, companyName: true },
            });
            if (!vendor) throw new Error(`Vendor "${vendorName}" not found`);
            vendorId = vendor.id;
        }

        const partNumber = params.partNumber;
        const qty = parseInt(params.qty || '0', 10);
        const rate = parseFloat(params.rate || '0');
        if (!partNumber || qty < 1) throw new Error('partNumber and qty are required');

        const dto = {
            vendorId,
            jobWorkType: 'job_work',
            poDate: new Date().toISOString(),
            deliveryDate: params.deliveryDate,
            items: [{
                partNumber,
                partDescription: params.description || partNumber,
                quantity: qty,
                ratePerPiece: rate,
                unitOfMeasure: params.unit || 'NOS',
            }],
        };

        const result = await this.purchaseOrdersService.create(dto as any, user.id, orgId);
        return `✓ PO created: ${(result as any).poNumber} — ${qty}× ${partNumber} @ ₹${rate}. View in Admin → Purchase Orders.`;
    }

    // ── ADD_PART ────────────────────────────────────────────────────────────────
    private async addPart(params: Record<string, string>, user: any): Promise<string> {
        const orgId = user.organizationId;

        const partNumber = params.partNumber;
        if (!partNumber) throw new Error('partNumber is required');

        // TrayConfiguration unique key is [organizationId, customerId, partNumber] — use findFirst + create/update
        const existing = await this.prisma.trayConfiguration.findFirst({
            where: { organizationId: orgId, partNumber, customerId: null },
        });
        if (existing) {
            await this.prisma.trayConfiguration.update({
                where: { id: existing.id },
                data: { description: params.description || partNumber },
            });
        } else {
            await this.prisma.trayConfiguration.create({
                data: {
                    partNumber,
                    description: params.description || partNumber,
                    capacity: parseInt(params.capacity || '100', 10),
                    unit: params.unit || 'NOS',
                    organizationId: orgId,
                },
            });
        }

        return `✓ Part added: ${partNumber} — "${params.description || partNumber}". Now available in tray configuration.`;
    }

    // ── UPDATE_DISPATCH ─────────────────────────────────────────────────────────
    private async updateDispatch(params: Record<string, string>, user: any): Promise<string> {
        const vendorId = user.vendorId;
        const partNumber = params.partNumber;
        const completedQty = parseInt(params.completedQty || params.qty || '0', 10);
        if (!partNumber || completedQty < 1) throw new Error('partNumber and completedQty are required');

        // Find the active job process for this part at this vendor
        const process = await this.prisma.jobProcess.findFirst({
            where: {
                status: { in: ['pending', 'in_progress'] },
                challanItem: {
                    partNumber: { contains: partNumber, mode: 'insensitive' },
                    challan: {
                        status: 'issued',
                        ...(vendorId ? { vendorId } : { vendor: { customer: { organizationId: user.organizationId } } }),
                    },
                },
            },
            select: { id: true, challanItem: { select: { partNumber: true, quantityIssued: true } } },
            orderBy: { createdAt: 'desc' },
        });

        if (!process) throw new Error(`No active job process found for part ${partNumber}`);

        await this.prisma.jobProcess.update({
            where: { id: process.id },
            data: {
                completedQuantity: completedQty,
                status: completedQty >= process.challanItem.quantityIssued ? 'completed' : 'in_progress',
                completedAt: completedQty >= process.challanItem.quantityIssued ? new Date() : undefined,
            },
        });

        const isComplete = completedQty >= process.challanItem.quantityIssued;
        return `✓ Updated: ${completedQty} units of ${process.challanItem.partNumber} marked ${isComplete ? 'completed — ready for dispatch!' : 'in progress'}.`;
    }

    // ── CREATE_INVOICE ──────────────────────────────────────────────────────────
    private async createInvoice(params: Record<string, string>, user: any): Promise<string> {
        const vendorId = user.vendorId;
        if (!vendorId) throw new Error('Only vendor users can create invoices');

        const challanNumber = params.challanNumber;
        if (!challanNumber) throw new Error('challanNumber is required');

        // Find the challan
        const challan = await this.prisma.deliveryChallan.findFirst({
            where: { challanNumber: { contains: challanNumber, mode: 'insensitive' }, vendorId },
            select: {
                id: true,
                challanNumber: true,
                customerId: true,
                items: {
                    select: {
                        id: true,
                        quantityIssued: true,
                        unitPrice: true,
                        jobProcesses: {
                            where: { status: 'completed' },
                            select: { id: true, processName: true },
                            take: 1,
                        },
                    },
                },
            },
        });

        if (!challan) throw new Error(`Challan ${challanNumber} not found or not yours`);

        const invoiceDate = new Date();
        const invoiceNumber = `INV/${invoiceDate.getFullYear()}/${String(invoiceDate.getMonth() + 1).padStart(2, '0')}/${Math.floor(Math.random() * 900) + 100}`;

        const dto = {
            invoiceNumber,
            invoiceDate,
            customerId: challan.customerId,
            items: challan.items.map((item: any) => ({
                challanItemId: item.id,
                invoiceQuantity: item.quantityIssued,
                unitPrice: item.unitPrice ?? undefined,
                operationName: item.jobProcesses?.[0]?.processName,
            })),
        };

        await this.vendorInvoiceService.createInvoice(vendorId, dto);
        return `✓ Invoice ${invoiceNumber} created for challan ${challan.challanNumber}. Submit it for approval in Vendor → Invoices.`;
    }

    // ── UPDATE_CHALLAN_STATUS ───────────────────────────────────────────────────
    private async updateChallanStatus(params: Record<string, string>, user: any): Promise<string> {
        const { challanId, challanNumber, status } = params;

        let id = challanId;
        if (!id && challanNumber) {
            const challan = await this.prisma.deliveryChallan.findFirst({
                where: { challanNumber: { contains: challanNumber, mode: 'insensitive' } },
                select: { id: true, challanNumber: true },
            });
            if (!challan) throw new Error(`Challan ${challanNumber} not found`);
            id = challan.id;
        }

        if (!id) throw new Error('challanId or challanNumber required');

        const validStatuses = ['draft', 'issued', 'received', 'rejected', 'closed'];
        if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

        await this.challansService.updateStatus(id, status as any);
        return `✓ Challan ${challanNumber || id} status updated to "${status}".`;
    }
}
