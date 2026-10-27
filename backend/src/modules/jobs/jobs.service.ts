import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobProcessDto } from './dto/create-job-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ProcessStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class JobsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    // ... (rest of methods)



    async createProcessWorkflow(challanItemId: string, processes: CreateJobProcessDto[]) {
        // Verify challan item exists
        const challanItem = await this.prisma.challanItem.findUnique({
            where: { id: challanItemId },
            include: {
                challan: {
                    select: {
                        id: true,
                        challanNumber: true,
                        status: true
                    }
                }
            }
        });

        if (!challanItem) {
            throw new NotFoundException('Challan item not found');
        }

        // Check for duplicate process sequences
        const sequences = processes.map(p => p.processSequence);
        const uniqueSequences = new Set(sequences);
        if (sequences.length !== uniqueSequences.size) {
            throw new BadRequestException('Duplicate process sequences found');
        }

        // Validate target quantities match issued quantity
        const firstProcess = processes.find(p => p.processSequence === 1);
        if (firstProcess && firstProcess.targetQuantity !== challanItem.quantityIssued) {
            throw new BadRequestException(
                `First process target quantity (${firstProcess.targetQuantity}) must match issued quantity (${challanItem.quantityIssued})`
            );
        }

        // Create all processes
        const createdProcesses = await Promise.all(
            processes.map(process =>
                this.prisma.jobProcess.create({
                    data: {
                        challanItemId,
                        ...process,
                        status: process.processSequence === 1 ? ProcessStatus.pending : ProcessStatus.pending
                    }
                })
            )
        );

        return createdProcesses;
    }

    async findAll(
        page: number = 1,
        limit: number = 20,
        vendorId?: string,
        status?: ProcessStatus,
        search?: string
    ) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (vendorId) {
            where.challanItem = {
                challan: {
                    vendorId
                }
            };
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { processName: { contains: search, mode: 'insensitive' as const } },
                { challanItem: { partNumber: { contains: search, mode: 'insensitive' as const } } }
            ];
        }

        const [processes, total] = await Promise.all([
            this.prisma.jobProcess.findMany({
                where,
                skip,
                take: limit,
                orderBy: [
                    { challanItem: { challan: { challanDate: 'desc' } } },
                    { processSequence: 'asc' }
                ],
                include: {
                    challanItem: {
                        include: {
                            challan: {
                                select: {
                                    id: true,
                                    challanNumber: true,
                                    challanDate: true,
                                    vendor: {
                                        select: {
                                            id: true,
                                            vendorCode: true,
                                            companyName: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            this.prisma.jobProcess.count({ where })
        ]);

        return {
            data: processes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findOne(id: string) {
        const process = await this.prisma.jobProcess.findUnique({
            where: { id },
            include: {
                challanItem: {
                    include: {
                        challan: {
                            include: {
                                vendor: {
                                    select: {
                                        id: true,
                                        vendorCode: true,
                                        companyName: true
                                    }
                                },
                                customer: {
                                    select: {
                                        id: true,
                                        companyName: true
                                    }
                                }
                            }
                        }
                    }
                },
                processUpdates: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        updatedBy: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        if (!process) {
            throw new NotFoundException(`Job process with ID ${id} not found`);
        }

        return process;
    }

    async updateProcess(id: string, updateDto: UpdateProcessDto, updatedById: string) {
        const process = await this.findOne(id);

        // Validate quantities
        const newCompleted = process.completedQuantity + updateDto.quantityCompleted;
        const newRejected = process.rejectedQuantity + (updateDto.quantityRejected || 0);
        const newRework = process.reworkQuantity + (updateDto.quantityRework || 0);

        const totalProcessed = newCompleted + newRejected + newRework;

        if (totalProcessed > process.targetQuantity) {
            throw new BadRequestException(
                `Total processed quantity (${totalProcessed}) exceeds target quantity (${process.targetQuantity})`
            );
        }

        // Create process update log
        await this.prisma.processUpdate.create({
            data: {
                jobProcessId: id,
                quantityCompleted: updateDto.quantityCompleted,
                quantityRejected: updateDto.quantityRejected || 0,
                quantityRework: updateDto.quantityRework || 0,
                remarks: updateDto.remarks,
                updatedById
            }
        });

        // Update process
        const isCompleted = totalProcessed === process.targetQuantity;
        const isInProgress = newCompleted > 0 && !isCompleted;

        const updatedProcess = await this.prisma.jobProcess.update({
            where: { id },
            data: {
                completedQuantity: newCompleted,
                rejectedQuantity: newRejected,
                reworkQuantity: newRework,
                status: isCompleted ? ProcessStatus.completed : isInProgress ? ProcessStatus.in_progress : ProcessStatus.pending,
                startedAt: process.startedAt || new Date(),
                completedAt: isCompleted ? new Date() : null
            },
            select: {
                id: true,
                processName: true,
                processSequence: true,
                challanItemId: true,
                completedQuantity: true,
                rejectedQuantity: true,
                reworkQuantity: true,
                status: true,
                startedAt: true,
                completedAt: true,
                challanItem: {
                    select: {
                        partDescription: true,
                        challan: {
                            select: {
                                customerId: true,
                                customer: { select: { id: true, organizationId: true } },
                                vendor: { select: { id: true, companyName: true } },
                            }
                        }
                    }
                }
            }
        });

        // If completed, check if this enables the next process
        if (isCompleted) {
            await this.enableNextProcess(updatedProcess.challanItemId, updatedProcess.processSequence);

            try {
                const organizationId = updatedProcess.challanItem.challan.customer?.organizationId || updatedProcess.challanItem.challan.customerId;

                // Parallel: check for next process + fetch notification recipients simultaneously
                const [nextProcessCheck, qualityUsers] = await Promise.all([
                    this.prisma.jobProcess.findFirst({
                        where: {
                            challanItemId: updatedProcess.challanItemId,
                            processSequence: (updatedProcess.processSequence ?? 0) + 1,
                        },
                        select: { id: true },
                    }),
                    this.prisma.user.findMany({
                        where: { organizationId, role: 'quality_head' as any, isActive: true },
                        select: { id: true },
                    }),
                ]);

                if (qualityUsers.length > 0) {
                    await this.notificationsService.createSystemNotification(
                        organizationId,
                        'process_completed',
                        'Job Process Completed',
                        `Process '${updatedProcess.processName}' for ${updatedProcess.challanItem.challan.vendor.companyName} is complete. Ready for Quality Check.`,
                        qualityUsers.map(u => u.id),
                        {
                            severity: 'medium',
                            entityType: 'job_process',
                            entityId: updatedProcess.id,
                            actionUrl: `/dashboard/quality/inspections`
                        }
                    );
                }

                if (!nextProcessCheck) {
                    // This was the final process — notify dispatch planners
                    const dispatchUsers = await this.prisma.user.findMany({
                        where: {
                            organizationId,
                            role: { in: ['ppc_manager', 'executive', 'production_manager'] as any },
                            isActive: true,
                        },
                        select: { id: true },
                    });

                    if (dispatchUsers.length > 0) {
                        await this.notificationsService.createSystemNotification(
                            organizationId,
                            'dispatch_ready',
                            'Ready for Dispatch',
                            `Production completed for ${updatedProcess.challanItem.partDescription}. Goods are ready for dispatch at ${updatedProcess.challanItem.challan.vendor.companyName}.`,
                            dispatchUsers.map(u => u.id),
                            {
                                severity: 'high',
                                entityType: 'job_process',
                                entityId: updatedProcess.id,
                                actionUrl: `/dashboard/executive/sourcing`
                            }
                        );
                    }
                }
            } catch (error) {
                console.error('Failed to send process completion notification:', error);
            }
        }

        return updatedProcess;
    }

    private async enableNextProcess(challanItemId: string, currentSequence: number) {
        const nextProcess = await this.prisma.jobProcess.findFirst({
            where: {
                challanItemId,
                processSequence: currentSequence + 1
            }
        });

        if (nextProcess && nextProcess.status === ProcessStatus.pending) {
            // Calculate target quantity for next process (current completed - rejected)
            const currentProcess = await this.prisma.jobProcess.findFirst({
                where: {
                    challanItemId,
                    processSequence: currentSequence
                }
            });

            if (currentProcess) {
                const availableQuantity = currentProcess.completedQuantity - currentProcess.rejectedQuantity;

                await this.prisma.jobProcess.update({
                    where: { id: nextProcess.id },
                    data: {
                        targetQuantity: availableQuantity
                    }
                });
            }
        }
    }

    async getProcessHistory(id: string) {
        await this.findOne(id);

        return this.prisma.processUpdate.findMany({
            where: { jobProcessId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                updatedBy: {
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

    async getReadyForDispatch(vendorId?: string) {
        const where: any = {
            status: ProcessStatus.completed
        };

        if (vendorId) {
            where.challanItem = {
                challan: {
                    vendorId
                }
            };
        }

        // Get all completed processes
        const completedProcesses = await this.prisma.jobProcess.findMany({
            where,
            include: {
                challanItem: {
                    include: {
                        challan: {
                            include: {
                                vendor: {
                                    select: {
                                        id: true,
                                        vendorCode: true,
                                        companyName: true
                                    }
                                }
                            }
                        },
                        jobProcesses: {
                            orderBy: { processSequence: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        // Filter to only include items where this is the last process
        const readyItems = completedProcesses.filter(process => {
            const allProcesses = process.challanItem.jobProcesses;
            const lastProcess = allProcesses[0];
            return lastProcess && lastProcess.id === process.id;
        });

        return readyItems.map(process => ({
            processId: process.id,
            challanItemId: process.challanItemId,
            challanNumber: process.challanItem.challan.challanNumber,
            partNumber: process.challanItem.partNumber,
            partDescription: process.challanItem.partDescription,
            quantityReady: process.completedQuantity - process.rejectedQuantity,
            vendor: process.challanItem.challan.vendor,
            completedAt: process.completedAt
        }));
    }

    async getReadyForDispatchByPart(partNumber?: string, vendorId?: string, customerId?: string) {
        const where: any = {
            status: ProcessStatus.completed
        };

        // Build nested where clause for challan item
        const challanWhere: any = {};

        if (vendorId) {
            challanWhere.vendorId = vendorId;
        }

        if (customerId) {
            challanWhere.customerId = customerId;
        }

        if (Object.keys(challanWhere).length > 0) {
            where.challanItem = {
                challan: challanWhere
            };
        }

        if (partNumber) {
            if (where.challanItem) {
                where.challanItem.partNumber = {
                    contains: partNumber,
                    mode: 'insensitive' as const
                };
            } else {
                where.challanItem = {
                    partNumber: {
                        contains: partNumber,
                        mode: 'insensitive' as const
                    }
                };
            }
        }

        // Get all completed processes
        const completedProcesses = await this.prisma.jobProcess.findMany({
            where,
            include: {
                challanItem: {
                    include: {
                        challan: {
                            include: {
                                vendor: {
                                    select: {
                                        id: true,
                                        vendorCode: true,
                                        companyName: true
                                    }
                                },
                                customer: {
                                    select: {
                                        id: true,
                                        companyName: true
                                    }
                                }
                            }
                        },
                        jobProcesses: {
                            orderBy: { processSequence: 'desc' },
                            take: 1
                        }
                    }
                }
            }
        });

        // Filter to only include items where this is the last process
        const readyItems = completedProcesses.filter(process => {
            const allProcesses = process.challanItem.jobProcesses;
            const lastProcess = allProcesses[0];
            return lastProcess && lastProcess.id === process.id;
        });

        // Group by part number
        const groupedByPart = readyItems.reduce((acc, process) => {
            const partNum = process.challanItem.partNumber;

            if (!acc[partNum]) {
                acc[partNum] = {
                    partNumber: partNum,
                    partDescription: process.challanItem.partDescription,
                    totalQuantityReady: 0,
                    vendors: []
                };
            }

            const quantityReady = process.completedQuantity - process.rejectedQuantity;
            acc[partNum].totalQuantityReady += quantityReady;

            // Find or create vendor entry
            let vendorEntry = acc[partNum].vendors.find(
                v => v.vendorId === process.challanItem.challan.vendor.id
            );

            if (!vendorEntry) {
                vendorEntry = {
                    vendorId: process.challanItem.challan.vendor.id,
                    vendorCode: process.challanItem.challan.vendor.vendorCode,
                    vendorName: process.challanItem.challan.vendor.companyName,
                    quantityReady: 0,
                    challanNumbers: []
                };
                acc[partNum].vendors.push(vendorEntry);
            }

            vendorEntry.quantityReady += quantityReady;
            if (!vendorEntry.challanNumbers.includes(process.challanItem.challan.challanNumber)) {
                vendorEntry.challanNumbers.push(process.challanItem.challan.challanNumber);
            }

            return acc;
        }, {} as Record<string, any>);

        return {
            data: Object.values(groupedByPart),
            summary: {
                totalParts: Object.keys(groupedByPart).length,
                totalQuantity: Object.values(groupedByPart).reduce((sum: number, part: any) => sum + part.totalQuantityReady, 0)
            }
        };
    }
}
