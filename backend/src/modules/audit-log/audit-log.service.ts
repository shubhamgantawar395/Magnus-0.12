import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditLogService {
    constructor(private prisma: PrismaService) { }

    async create(data: CreateAuditLogDto) {
        return this.prisma.auditLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                changes: data.changes || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        });
    }

    async findAll(page: number = 1, limit: number = 50, filters?: any) {
        const skip = (page - 1) * limit;

        const where: any = {};
        if (filters?.userId) where.userId = filters.userId;
        if (filters?.action) where.action = filters.action;
        if (filters?.entityType) where.entityType = filters.entityType;
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
            if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return {
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findByUser(userId: string, page: number = 1, limit: number = 50) {
        return this.findAll(page, limit, { userId });
    }

    async findByEntity(entityType: string, entityId: string) {
        return this.prisma.auditLog.findMany({
            where: {
                entityType,
                entityId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
