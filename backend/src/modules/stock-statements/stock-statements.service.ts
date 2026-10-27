import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockStatementDto } from './dto/create-stock-statement.dto';
import { UpdateStockStatementDto } from './dto/update-stock-statement.dto';
import { VerifyStockStatementDto } from './dto/verify-stock-statement.dto';
import { ChallanStatus } from '@prisma/client';

@Injectable()
export class StockStatementsService {
    constructor(private prisma: PrismaService) { }

    async create(createDto: CreateStockStatementDto, userId: string, organizationId: string) {
        const { vendorId, periodFrom, periodTo, remarks } = createDto;
        console.log(`Creating SS for Vendor: ${vendorId}, Org: ${organizationId}`);

        // 1. Validate Vendor
        const vendor = await this.prisma.vendor.findFirst({
            where: { id: vendorId, organizationId }
        });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const startDate = new Date(periodFrom);
        const endDate = new Date(periodTo);
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();

        // 2. Check for existing statement
        // Using findFirst to avoid potential unique constraint naming issues in Prisma Client
        const existing = await this.prisma.stockStatement.findFirst({
            where: {
                organizationId,
                vendorId,
                statementNumber: `SS/${year}/${month}` // This is a heuristic check, actual number gen below
            }
        });

        // 3. Generate Statement Number
        const statementNumber = `SS/${vendor.vendorCode}/${year}/${String(month).padStart(2, '0')}`;

        // Check if exists by number
        const exists = await this.prisma.stockStatement.findFirst({
            where: { organizationId, statementNumber }
        });
        if (exists) throw new BadRequestException(`Stock statement ${statementNumber} already exists`);

        // 4. Calculate Challan-Based Stock Items (NEW FORMAT)
        const challanItemsPayload = await this.calculateChallanBasedStock(organizationId, vendorId, endDate);

        // 5. Create Stock Statement with challan-based format
        return this.prisma.stockStatement.create({
            data: {
                organizationId,
                vendorId,
                statementNumber,
                statementDate: new Date(),
                periodFrom: startDate,
                periodTo: endDate,
                status: 'draft',
                managedById: userId,
                remarks,
                challanItems: {
                    create: challanItemsPayload
                }
            },
            include: {
                challanItems: true,
                vendor: true
            }
        });
    }

    async findAll(organizationId: string, filters?: any) {
        const whereClause: any = { ...filters };
        if (organizationId) {
            whereClause.organizationId = organizationId;
        }
        return this.prisma.stockStatement.findMany({
            where: whereClause,
            include: {
                vendor: { select: { companyName: true, vendorCode: true } },
                managedBy: { select: { firstName: true, lastName: true } }
            },
            orderBy: { periodFrom: 'desc' }
        });
    }

    async findOne(id: string, organizationId: string) {
        const statement = await this.prisma.stockStatement.findFirst({
            where: { id, organizationId },
            include: {
                items: true,           // Old format (for backward compatibility)
                challanItems: true,    // New challan-based format
                vendor: true,
                managedBy: true,
                verifiedBy: true
            }
        });
        if (!statement) throw new NotFoundException('Stock Statement not found');
        return statement;
    }

    async update(id: string, updateDto: UpdateStockStatementDto, organizationId: string) {
        const { items, ...data } = updateDto;

        // Transaction to update header and items
        return this.prisma.$transaction(async (prisma) => {
            // 1. Update Header
            const statement = await prisma.stockStatement.update({
                where: { id },
                data: data
            });

            // 2. Update Items if provided
            if (items && items.length > 0) {
                for (const item of items) {
                    // Fetch current verify to calc variance
                    const currentItem = await prisma.stockStatementItem.findUnique({ where: { id: item.id } });
                    if (currentItem && item.physicalStock !== undefined) {
                        const variance = item.physicalStock - currentItem.closingBalance;
                        await prisma.stockStatementItem.update({
                            where: { id: item.id },
                            data: {
                                physicalStock: item.physicalStock,
                                variance: variance,
                                remarks: item.remarks // Assuming remarks field exists on item or varianceReason
                            }
                        });
                    }
                }
            }
            return statement;
        });
    }

    // --- Calculation Logic ---
    private async calculateStockItems(organizationId: string, vendorId: string, startDate: Date, endDate: Date) {
        console.log('--- Calculating Stock Items ---');
        console.log({ organizationId, vendorId, startDate, endDate });

        // 1. Identify Parts (Inward)
        try {
            const challans = await this.prisma.deliveryChallan.findMany({
                where: {
                    organizationId,
                    vendorId,
                    challanDate: { lte: endDate }, // All challans up to period end
                    status: { not: ChallanStatus.rejected }
                },
                include: { items: true }
            });
            console.log(`Found ${challans.length} challans`);

            const partStats = new Map<string, {
                partNumber: string,
                partDescription: string,
                inward: number
            }>();

            // 2. Sum Inwards
            for (const ch of challans) {
                for (const item of ch.items) {
                    const key = item.partNumber;
                    if (!partStats.has(key)) {
                        partStats.set(key, {
                            partNumber: item.partNumber,
                            partDescription: item.partDescription || '',
                            inward: 0
                        });
                    }
                    partStats.get(key).inward += item.quantityIssued;
                }
            }

            // 3. Get Opening Balance (Previous Statement)
            // Find latest statement before this period
            const previousStatement = await this.prisma.stockStatement.findFirst({
                where: {
                    organizationId,
                    vendorId,
                    periodTo: { lt: startDate }
                },
                orderBy: { periodTo: 'desc' },
                include: { items: true }
            });

            // 4. Calculate Consumption (Invoice-Based)
            console.log('Calculating consumption from approved invoices...');
            // Stock is consumed when invoices are approved by PPC
            const consumptionStats = await this.calculateInvoiceConsumption(organizationId, vendorId, startDate, endDate);
            console.log('Consumption stats calculated from invoices');

            // 5. Merge all Data
            console.log('Merging data...');
            // We need a superset of parts: Inward OR Opening OR Consumed
            const allPartNumbers = new Set([
                ...partStats.keys(),
                ...(previousStatement?.items?.map(i => i.partNumber) || []),
                ...consumptionStats.keys()
            ]);
            console.log(`Total unique parts: ${allPartNumbers.size}`);

            const results = [];
            for (const partNumber of allPartNumbers) {
                // Inward
                const inward = partStats.get(partNumber)?.inward || 0;
                const description = partStats.get(partNumber)?.partDescription || previousStatement?.items.find(i => i.partNumber === partNumber)?.partDescription || '';

                // Opening
                const openingItem = previousStatement?.items.find(i => i.partNumber === partNumber);
                const openingBalance = openingItem ? openingItem.closingBalance : 0; // Carry forward closing to opening

                // Consumption (from approved invoices)
                const consumed = consumptionStats.get(partNumber)?.consumed || 0;

                // Rejected and Returned are no longer tracked via process updates
                const rejected = 0;
                const returned = 0;

                // Closing Balance = Opening + Inward - Consumed
                const closingBalance = openingBalance + inward - consumed;

                results.push({
                    partNumber,
                    partDescription: description,
                    openingBalance,
                    receivedQty: inward, // Field name in model is receivedQty
                    consumedQty: consumed,
                    rejectedQty: rejected,
                    returnedQty: returned,
                    closingBalance
                });
            }
            console.log(`Generated ${results.length} results`);

            return results;
        } catch (e) {
            console.error('Error in calculateStockItems:', e);
            throw e;
        }
    }

    private async calculateInvoiceConsumption(
        organizationId: string,
        vendorId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Map<string, { consumed: number }>> {
        // Get ALL approved invoices up to period end (cumulative consumption)
        // Note: VendorInvoice model doesn't have approvedAt, using updatedAt as proxy
        const invoices = await this.prisma.vendorInvoice.findMany({
            where: {
                vendorId,
                status: 'approved',
                // All approved invoices up to period end
                updatedAt: { lte: endDate }
            },
            include: {
                items: true
            }
        });

        const stats = new Map<string, { consumed: number }>();

        for (const invoice of invoices) {
            for (const item of invoice.items) {
                if (!stats.has(item.partNumber)) {
                    stats.set(item.partNumber, { consumed: 0 });
                }
                stats.get(item.partNumber).consumed += item.invoiceQuantity;
            }
        }

        return stats;
    }

    /**
     * OLD METHOD: Calculate consumption based on process updates
     * DEPRECATED: Replaced by calculateInvoiceConsumption
     * Kept for reference/rollback purposes
     */
    private async calculateConsumption(organizationId: string, vendorId: string, startDate: Date, endDate: Date) {
        // Fetch all relevant process updates for the period
        const updates = await this.prisma.processUpdate.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                jobProcess: {
                    processSequence: 1, // Only count first process as "Consumption of RM"
                    challanItem: {
                        challan: {
                            organizationId,
                            vendorId
                        }
                    }
                }
            },
            include: {
                jobProcess: {
                    include: {
                        challanItem: true
                    }
                }
            }
        });

        const stats = new Map<string, { consumed: number, rejected: number }>();

        for (const update of updates) {
            const partNumber = update.jobProcess.challanItem.partNumber;
            if (!stats.has(partNumber)) {
                stats.set(partNumber, { consumed: 0, rejected: 0 });
            }
            const entry = stats.get(partNumber);
            entry.consumed += update.quantityCompleted;
            entry.rejected += update.quantityRejected;
            // rework doesn't consume new material usually, it stays in line
        }

        return stats;
    }

    /**
     * NEW: Calculate challan-based stock with FIFO dispatch allocation
     * Returns individual challan rows instead of aggregated part totals
     */
    private async calculateChallanBasedStock(
        organizationId: string,
        vendorId: string,
        periodEnd: Date
    ): Promise<any[]> {
        // 1. Get all challans for vendor up to period end (FIFO order)
        const challans = await this.prisma.deliveryChallan.findMany({
            where: {
                organizationId,
                vendorId,
                challanDate: { lte: periodEnd },
                status: { not: ChallanStatus.rejected }
            },
            include: { items: true },
            orderBy: { challanDate: 'asc' } // FIFO: oldest first
        });

        // 2. Get all approved vendor invoices up to period end
        const invoices = await this.prisma.vendorInvoice.findMany({
            where: {
                vendorId,
                status: 'approved',
                updatedAt: { lte: periodEnd }
            },
            include: { items: true }
        });

        // 3. Build FIFO allocation map: challanId-partNumber -> dispatchedQty
        const challanDispatch = new Map<string, number>();

        for (const invoice of invoices) {
            for (const invoiceItem of invoice.items) {
                let remaining = invoiceItem.invoiceQuantity;

                // FIFO: Allocate to oldest challan first
                for (const challan of challans) {
                    if (remaining <= 0) break;

                    const challanItem = challan.items.find(
                        ci => ci.partNumber === invoiceItem.partNumber
                    );
                    if (!challanItem) continue;

                    const key = `${challan.id}-${invoiceItem.partNumber}`;
                    const alreadyDispatched = challanDispatch.get(key) || 0;
                    const available = challanItem.quantityIssued - alreadyDispatched;

                    if (available > 0) {
                        const allocate = Math.min(remaining, available);
                        challanDispatch.set(key, alreadyDispatched + allocate);
                        remaining -= allocate;
                    }
                }

                // If remaining > 0, it means vendor over-invoiced (shouldn't happen with validation)
                if (remaining > 0) {
                    console.warn(
                        `Warning: Invoice ${invoice.invoiceNumber} has ${remaining} units ` +
                        `of part ${invoiceItem.partNumber} that couldn't be allocated to any challan`
                    );
                }
            }
        }

        // 4. Build result items (one row per challan item)
        const items = [];
        for (const challan of challans) {
            for (const challanItem of challan.items) {
                const key = `${challan.id}-${challanItem.partNumber}`;
                const dispatchQty = challanDispatch.get(key) || 0;
                const balanceQty = challanItem.quantityIssued - dispatchQty;

                items.push({
                    challanId: challan.id,
                    challanNumber: challan.challanNumber,
                    challanDate: challan.challanDate,
                    partNumber: challanItem.partNumber,
                    partName: challanItem.partDescription || '',
                    challanQty: challanItem.quantityIssued,
                    dispatchQty,
                    balanceQty
                });
            }
        }

        return items;
    }

}


