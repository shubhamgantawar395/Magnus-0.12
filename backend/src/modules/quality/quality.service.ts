import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQualityCheckDto } from './dto/create-quality-check.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateQualityCheckDto } from './dto/update-quality-check.dto';
import { QualityStatus } from '@prisma/client';

@Injectable()
export class QualityService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(createDto: CreateQualityCheckDto, inspectorId: string) {
        // Validate that at least one reference (challan or jobProcess) is provided
        if (!createDto.challanId && !createDto.jobProcessId) {
            throw new BadRequestException('Either challanId or jobProcessId must be provided');
        }

        // Validate quantities
        const total = createDto.acceptedQty + createDto.rejectedQty + createDto.reworkQty;
        if (total > createDto.sampleSize) {
            throw new BadRequestException('Sum of accepted, rejected, and rework quantities cannot exceed sample size');
        }

        // Determine status based on results
        let status: QualityStatus;
        if (createDto.rejectedQty === 0 && createDto.reworkQty === 0) {
            status = QualityStatus.passed;
        } else if (createDto.acceptedQty === 0) {
            status = QualityStatus.failed;
        } else {
            status = QualityStatus.conditional_pass;
        }

        // Generate check number
        const checkNumber = await this.generateCheckNumber();

        const qualityCheck = await this.prisma.qualityCheck.create({
            data: {
                checkNumber,
                checkDate: new Date(createDto.checkDate),
                challanId: createDto.challanId,
                jobProcessId: createDto.jobProcessId,
                inspectorId,
                sampleSize: createDto.sampleSize,
                acceptedQty: createDto.acceptedQty,
                rejectedQty: createDto.rejectedQty,
                reworkQty: createDto.reworkQty,
                status,
                defects: createDto.defects || null,
                remarks: createDto.remarks,
                attachments: createDto.attachments || [],
            },
            include: {
                inspector: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                challan: {
                    select: {
                        id: true,
                        challanNumber: true,
                        vendor: {
                            select: {
                                id: true,
                                companyName: true,
                            },
                        },
                    },
                },
                jobProcess: {
                    select: {
                        id: true,
                        processName: true,
                        challanItem: {
                            select: {
                                partNumber: true,
                                partDescription: true,
                            },
                        },
                    },
                },
            },
        });



        // Notify if quality check failed or conditional pass
        if (status === QualityStatus.failed || status === QualityStatus.conditional_pass) {
            try {
                // Find vendor users to notify
                const vendorId = qualityCheck.challan?.vendor?.id;
                if (vendorId) {
                    const vendorUsers = await this.prisma.user.findMany({
                        where: {
                            organization: {
                                vendors: {
                                    some: { id: vendorId }
                                }
                            }
                        },
                        select: { id: true }
                    });

                    if (vendorUsers.length > 0) {
                        const severity = status === QualityStatus.failed ? 'high' : 'medium';
                        const title = status === QualityStatus.failed ? 'Quality Check Failed' : 'Quality Check Conditional Pass';

                        // We need organizationId, for now assuming it's linked to the inspector (user)
                        // Or we can get it from the vendor's customer (organization)
                        // This logic might need refinement depending on where organizationId comes from contextually
                        // For now, let's use the inspector's organization if possible, or skip if we can't easily determine it without an extra query.
                        // Actually, NotificationsService.createSystemNotification requires organizationId.
                        // Let's assume the inspector's organization is the one context.
                        // We can fetch inspector's organizationId
                        const inspector = await this.prisma.user.findUnique({
                            where: { id: inspectorId },
                            select: { organizationId: true }
                        });

                        if (inspector?.organizationId) {
                            await this.notificationsService.createSystemNotification(
                                inspector.organizationId,
                                'quality_alert',
                                title,
                                `Quality Check ${qualityCheck.checkNumber} status: ${status}. Accepted: ${qualityCheck.acceptedQty}, Rejected: ${qualityCheck.rejectedQty}`,
                                vendorUsers.map(u => u.id),
                                {
                                    severity: severity,
                                    entityType: 'quality_check',
                                    entityId: qualityCheck.id,
                                    actionUrl: `/dashboard/vendor/quality`
                                }
                            );
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to send notification for quality check:', error);
            }
        }

        return qualityCheck;
    }

    async findAll(filters: {
        organizationId?: string;
        vendorId?: string;
        status?: QualityStatus;
        fromDate?: Date;
        toDate?: Date;
    }) {
        const where: any = {};

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.fromDate || filters.toDate) {
            where.checkDate = {};
            if (filters.fromDate) where.checkDate.gte = filters.fromDate;
            if (filters.toDate) where.checkDate.lte = filters.toDate;
        }

        if (filters.vendorId) {
            where.challan = {
                vendorId: filters.vendorId,
            };
        }

        const qualityChecks = await this.prisma.qualityCheck.findMany({
            where,
            include: {
                inspector: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                challan: {
                    select: {
                        id: true,
                        challanNumber: true,
                        vendor: {
                            select: {
                                id: true,
                                companyName: true,
                            },
                        },
                    },
                },
                jobProcess: {
                    select: {
                        id: true,
                        processName: true,
                        challanItem: {
                            select: {
                                partNumber: true,
                                partDescription: true,
                            },
                        },
                    },
                },
            },
            orderBy: { checkDate: 'desc' },
        });

        return qualityChecks;
    }

    async findOne(id: string) {
        const qualityCheck = await this.prisma.qualityCheck.findUnique({
            where: { id },
            include: {
                inspector: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                challan: {
                    select: {
                        id: true,
                        challanNumber: true,
                        challanDate: true,
                        vendor: {
                            select: {
                                id: true,
                                companyName: true,
                                vendorCode: true,
                            },
                        },
                    },
                },
                jobProcess: {
                    select: {
                        id: true,
                        processName: true,
                        processType: true,
                        challanItem: {
                            select: {
                                partNumber: true,
                                partDescription: true,
                            },
                        },
                    },
                },
                ncrs: true,
            },
        });

        if (!qualityCheck) {
            throw new NotFoundException('Quality check not found');
        }

        return qualityCheck;
    }

    async update(id: string, updateDto: UpdateQualityCheckDto) {
        await this.findOne(id); // Verify exists

        const updateData: any = { ...updateDto };

        // Recalculate status if quantities are updated
        if (updateDto.acceptedQty !== undefined || updateDto.rejectedQty !== undefined || updateDto.reworkQty !== undefined) {
            const check = await this.prisma.qualityCheck.findUnique({ where: { id } });
            const acceptedQty = updateDto.acceptedQty ?? check.acceptedQty;
            const rejectedQty = updateDto.rejectedQty ?? check.rejectedQty;
            const reworkQty = updateDto.reworkQty ?? check.reworkQty;

            if (rejectedQty === 0 && reworkQty === 0) {
                updateData.status = QualityStatus.passed;
            } else if (acceptedQty === 0) {
                updateData.status = QualityStatus.failed;
            } else {
                updateData.status = QualityStatus.conditional_pass;
            }
        }

        if (updateDto.checkDate) {
            updateData.checkDate = new Date(updateDto.checkDate);
        }

        return this.prisma.qualityCheck.update({
            where: { id },
            data: updateData,
            include: {
                inspector: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                challan: {
                    select: {
                        id: true,
                        challanNumber: true,
                        vendor: {
                            select: {
                                id: true,
                                companyName: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getStatistics(filters: {
        organizationId?: string;
        vendorId?: string;
        fromDate?: Date;
        toDate?: Date;
    }) {
        const where: any = {};

        if (filters.fromDate || filters.toDate) {
            where.checkDate = {};
            if (filters.fromDate) where.checkDate.gte = filters.fromDate;
            if (filters.toDate) where.checkDate.lte = filters.toDate;
        }

        if (filters.vendorId) {
            where.challan = {
                vendorId: filters.vendorId,
            };
        }

        const [totalInspections, statusCounts, quantityCounts] = await Promise.all([
            this.prisma.qualityCheck.count({ where }),
            this.prisma.qualityCheck.groupBy({
                by: ['status'],
                where,
                _count: true,
            }),
            this.prisma.qualityCheck.aggregate({
                where,
                _sum: {
                    sampleSize: true,
                    acceptedQty: true,
                    rejectedQty: true,
                    reworkQty: true,
                },
            }),
        ]);

        const pendingInspections = statusCounts.find(s => s.status === QualityStatus.pending)?._count || 0;
        const passedInspections = statusCounts.find(s => s.status === QualityStatus.passed)?._count || 0;
        const failedInspections = statusCounts.find(s => s.status === QualityStatus.failed)?._count || 0;

        const totalSamples = quantityCounts._sum.sampleSize || 0;
        const totalAccepted = quantityCounts._sum.acceptedQty || 0;
        const totalRejected = quantityCounts._sum.rejectedQty || 0;

        const approvalRate = totalSamples > 0 ? (totalAccepted / totalSamples) * 100 : 0;
        const rejectionRate = totalSamples > 0 ? (totalRejected / totalSamples) * 100 : 0;

        return {
            totalInspections,
            pendingInspections,
            passedInspections,
            failedInspections,
            totalSamplesInspected: totalSamples,
            totalAccepted,
            totalRejected,
            totalRework: quantityCounts._sum.reworkQty || 0,
            approvalRate: parseFloat(approvalRate.toFixed(2)),
            rejectionRate: parseFloat(rejectionRate.toFixed(2)),
        };
    }

    async getVendorQualityMetrics(vendorId: string, fromDate?: Date, toDate?: Date) {
        const where: any = {
            challan: {
                vendorId,
            },
        };

        if (fromDate || toDate) {
            where.checkDate = {};
            if (fromDate) where.checkDate.gte = fromDate;
            if (toDate) where.checkDate.lte = toDate;
        }

        const checks = await this.prisma.qualityCheck.findMany({
            where,
            select: {
                sampleSize: true,
                acceptedQty: true,
                rejectedQty: true,
                reworkQty: true,
                status: true,
                checkDate: true,
            },
        });

        const totalSamples = checks.reduce((sum, c) => sum + c.sampleSize, 0);
        const totalAccepted = checks.reduce((sum, c) => sum + c.acceptedQty, 0);
        const totalRejected = checks.reduce((sum, c) => sum + c.rejectedQty, 0);
        const totalRework = checks.reduce((sum, c) => sum + c.reworkQty, 0);

        return {
            vendorId,
            totalInspections: checks.length,
            totalSamples,
            totalAccepted,
            totalRejected,
            totalRework,
            approvalRate: totalSamples > 0 ? parseFloat(((totalAccepted / totalSamples) * 100).toFixed(2)) : 0,
            rejectionRate: totalSamples > 0 ? parseFloat(((totalRejected / totalSamples) * 100).toFixed(2)) : 0,
        };
    }

    async getQualityTrends(filters: {
        organizationId?: string;
        vendorId?: string;
        fromDate?: Date;
        toDate?: Date;
    }) {
        const where: any = {};

        if (filters.fromDate || filters.toDate) {
            where.checkDate = {};
            if (filters.fromDate) where.checkDate.gte = filters.fromDate;
            if (filters.toDate) where.checkDate.lte = filters.toDate;
        }

        if (filters.vendorId) {
            where.challan = {
                vendorId: filters.vendorId,
            };
        }

        const checks = await this.prisma.qualityCheck.findMany({
            where,
            select: {
                checkDate: true,
                status: true,
            },
            orderBy: {
                checkDate: 'asc',
            },
        });

        // Group by date
        const trends = checks.reduce((acc, check) => {
            const date = check.checkDate.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { date, passed: 0, failed: 0, conditional: 0, total: 0 };
            }
            acc[date].total++;
            if (check.status === QualityStatus.passed) acc[date].passed++;
            else if (check.status === QualityStatus.failed) acc[date].failed++;
            else if (check.status === QualityStatus.conditional_pass) acc[date].conditional++;
            return acc;
        }, {} as Record<string, any>);

        return Object.values(trends);
    }

    async getDefectDistribution(filters: {
        organizationId?: string;
        vendorId?: string;
        fromDate?: Date;
        toDate?: Date;
    }) {
        const where: any = {};

        if (filters.fromDate || filters.toDate) {
            where.checkDate = {};
            if (filters.fromDate) where.checkDate.gte = filters.fromDate;
            if (filters.toDate) where.checkDate.lte = filters.toDate;
        }

        if (filters.vendorId) {
            where.challan = {
                vendorId: filters.vendorId,
            };
        }

        const checks = await this.prisma.qualityCheck.findMany({
            where,
            select: {
                defects: true,
            },
        });

        const distribution: Record<string, number> = {};

        checks.forEach(check => {
            if (Array.isArray(check.defects)) {
                check.defects.forEach((defect: any) => {
                    const type = defect.type || 'Unknown';
                    const count = defect.count || 1; // Default to 1 if count missing
                    distribution[type] = (distribution[type] || 0) + count;
                });
            }
        });

        return Object.entries(distribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }

    private async generateCheckNumber(): Promise<string> {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const prefix = `QC/${year}/${month}/`;

        const lastCheck = await this.prisma.qualityCheck.findFirst({
            where: {
                checkNumber: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                checkNumber: 'desc',
            },
        });

        let sequence = 1;
        if (lastCheck) {
            const lastSequence = parseInt(lastCheck.checkNumber.split('/').pop() || '0');
            sequence = lastSequence + 1;
        }

        return `${prefix}${String(sequence).padStart(4, '0')}`;
    }

    async getJobsForQuality(organizationId: string) {
        return this.prisma.jobProcess.findMany({
            where: {
                challanItem: {
                    challan: { organizationId }
                }
            },
            include: {
                challanItem: {
                    include: {
                        challan: { select: { challanNumber: true, vendor: { select: { companyName: true, id: true } } } }
                    }
                },
                machine: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async uploadPcp(partOperationId: string, pcpUrl: string) {
        return this.prisma.partOperation.update({
            where: { id: partOperationId },
            data: { pcpDocumentUrl: pcpUrl }
        });
    }

    async submitMeasurements(jobProcessId: string, measurements: any, inspectorId: string) {
        return this.prisma.jobProcess.update({
            where: { id: jobProcessId },
            data: { measurements }
        });
    }

    async requestLiveCheck(jobProcessId: string, link: string) {
        const job = await this.prisma.jobProcess.update({
            where: { id: jobProcessId },
            data: { liveCheckLink: link },
            include: {
                challanItem: {
                    include: { challan: true }
                }
            }
        });

        // Alert vendor
        const vendorId = job.challanItem?.challan?.vendorId;
        const orgId = job.challanItem?.challan?.organizationId;
        if (vendorId && orgId) {
            const vendorUsers = await this.prisma.user.findMany({
                where: { vendorId: vendorId },
                select: { id: true }
            });

            if (vendorUsers.length) {
                await this.notificationsService.createSystemNotification(
                    orgId,
                    'live_check',
                    'Live Check Requested',
                    `Please join the live check for process ${job.processName}`,
                    vendorUsers.map(u => u.id),
                    { actionUrl: link }
                );
            }
        }
        return job;
    }
}
