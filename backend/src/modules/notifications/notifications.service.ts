import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        private prisma: PrismaService,
        private notificationsGateway: NotificationsGateway
    ) { }

    async create(createDto: CreateNotificationDto, organizationId: string) {
        const notification = await this.prisma.alert.create({
            data: {
                organizationId,
                type: createDto.type,
                severity: createDto.severity,
                title: createDto.title,
                message: createDto.message,
                entityType: createDto.entityType,
                entityId: createDto.entityId,
                recipientIds: createDto.recipientIds,
                actionRequired: createDto.actionRequired || false,
                actionUrl: createDto.actionUrl,
                readBy: [],
            },
        });

        // Real-time update
        this.notificationsGateway.emitToUsers(createDto.recipientIds, 'notification', notification);

        return notification;
    }

    async findAllForUser(userId: string, filters?: { isRead?: boolean; type?: string }) {
        const where: any = {
            recipientIds: {
                has: userId,
            },
        };

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.isRead !== undefined) {
            if (filters.isRead) {
                where.readBy = {
                    has: userId,
                };
            } else {
                where.NOT = {
                    readBy: {
                        has: userId,
                    },
                };
            }
        }

        const notifications = await this.prisma.alert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50, // Limit to last 50 notifications
        });

        return notifications;
    }

    async markAsRead(id: string, userId: string) {
        const notification = await this.prisma.alert.findUnique({
            where: { id },
        });

        if (!notification) {
            return null;
        }

        // Add userId to readBy array if not already present
        const readBy = notification.readBy || [];
        if (!readBy.includes(userId)) {
            readBy.push(userId);
        }

        return this.prisma.alert.update({
            where: { id },
            data: { readBy },
        });
    }

    async markAllAsRead(userId: string, organizationId: string) {
        // Get all unread notifications for user
        const unreadNotifications = await this.prisma.alert.findMany({
            where: {
                organizationId,
                recipientIds: {
                    has: userId,
                },
                NOT: {
                    readBy: {
                        has: userId,
                    },
                },
            },
        });

        // Update each notification
        const updatePromises = unreadNotifications.map((notification) => {
            const readBy = notification.readBy || [];
            readBy.push(userId);
            return this.prisma.alert.update({
                where: { id: notification.id },
                data: { readBy },
            });
        });

        await Promise.all(updatePromises);

        return { updated: unreadNotifications.length };
    }

    async getUnreadCount(userId: string) {
        const count = await this.prisma.alert.count({
            where: {
                recipientIds: {
                    has: userId,
                },
                NOT: {
                    readBy: {
                        has: userId,
                    },
                },
            },
        });

        return { count };
    }

    async createSystemNotification(
        organizationId: string,
        type: string,
        title: string,
        message: string,
        recipientIds: string[],
        options?: {
            severity?: string;
            entityType?: string;
            entityId?: string;
            actionUrl?: string;
        }
    ) {
        return this.create(
            {
                type,
                severity: options?.severity || 'medium',
                title,
                message,
                recipientIds,
                entityType: options?.entityType,
                entityId: options?.entityId,
                actionUrl: options?.actionUrl,
            },
            organizationId
        );
    }

    async sendDailyDigest(organizationId: string) {
        const [overdueCount, pendingPOs] = await Promise.all([
            this.prisma.deliveryChallan.count({
                where: {
                    customer: { organizationId },
                    status: { in: ['issued', 'received'] as any },
                    challanDate: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            }),
            this.prisma.purchaseOrder.count({
                where: { organizationId, status: 'pending_approval' as any }
            })
        ]);

        if (overdueCount === 0 && pendingPOs === 0) return;

        const recipients = await this.prisma.user.findMany({
            where: { organizationId, role: { in: ['director', 'ppc_manager', 'gm'] as any }, isActive: true },
            select: { id: true }
        });

        if (recipients.length === 0) return;

        return this.createSystemNotification(
            organizationId,
            'daily_digest',
            'Daily Operations Digest',
            `Summary: ${overdueCount} overdue challans and ${pendingPOs} POs awaiting approval.`,
            recipients.map(r => r.id),
            { severity: 'medium', actionUrl: '/dashboard/executive/war-room' }
        );
    }
}
