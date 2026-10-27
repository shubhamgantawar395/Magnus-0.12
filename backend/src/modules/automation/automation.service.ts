import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AutomationService {
    private readonly logger = new Logger(AutomationService.name);

    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_10AM)
    async handleJobDeadlines() {
        this.logger.log('Checking for job deadlines (Upcoming & Overdue)...');

        const today = new Date();
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        try {
            // Find active challan items (Material with Vendor)
            const activeChallans = await this.prisma.deliveryChallan.findMany({
                where: {
                    status: { in: ['issued', 'received'] }
                },
                include: {
                    items: {
                        include: {
                            poItem: true,
                            jobProcesses: true
                        }
                    },
                    vendor: true,
                    customer: true
                }
            });

            for (const challan of activeChallans) {
                // If created by Organization (Customer), it's material sent TO Vendor (Outward)
                // We want to alert Vendor about return deadline.
                // Assuming Organization -> Vendor flow for now (Maesof)

                for (const item of challan.items) {
                    // Determine due date
                    const dueDate = item.poItem?.deliverySchedule || new Date(challan.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

                    const isOverdue = dueDate < today;
                    const isUpcoming = dueDate > today && dueDate <= twoDaysFromNow;

                    if (isOverdue || isUpcoming) {
                        // Check completion status (Simplified)
                        // In real app, check quantity produced vs issued
                        const isCompleted = item.jobProcesses.some(p => p.status === 'completed'); // Very basic check

                        if (!isCompleted) {
                            const type = isOverdue ? 'job_overdue' : 'job_deadline_approaching';
                            const severity = isOverdue ? 'high' : 'medium';
                            const title = isOverdue ? 'Overdue Job Alert' : 'Upcoming Delivery Deadline';
                            const msg = isOverdue
                                ? `Job for part ${item.partNumber} (Challan ${challan.challanNumber}) is OVERDUE. Expected: ${dueDate.toLocaleDateString()}.`
                                : `Job for part ${item.partNumber} (Challan ${challan.challanNumber}) is due soon: ${dueDate.toLocaleDateString()}.`;

                            this.logger.warn(`${title}: Challan ${challan.challanNumber}, Item ${item.partNumber}`);

                            // Notify Vendor
                            const vendorUsers = await this.prisma.user.findMany({
                                where: {
                                    vendorId: challan.vendorId,
                                    isActive: true,
                                    role: { in: ['vendor_owner', 'vendor_ppc'] } // Adjust roles as per enum
                                },
                                select: { id: true }
                            });

                            if (vendorUsers.length > 0) {
                                await this.notificationsService.createSystemNotification(
                                    challan.customerId,
                                    type,
                                    title,
                                    msg,
                                    vendorUsers.map(u => u.id),
                                    {
                                        severity,
                                        entityType: 'challan',
                                        entityId: challan.id,
                                        actionUrl: `/dashboard/vendor/challans/${challan.id}`
                                    }
                                );
                            }

                            // Escalation Logic (Overdue > 3 Days)
                            const escalationDate = new Date(dueDate);
                            escalationDate.setDate(escalationDate.getDate() + 3);

                            if (today > escalationDate) {
                                this.logger.warn(`Escalating Overdue Job: Challan ${challan.challanNumber}`);

                                // Notify Organization Executives
                                const execUsers = await this.prisma.user.findMany({
                                    where: {
                                        organizationId: challan.customerId, // Customer is the Org
                                        isActive: true,
                                        role: { in: ['director', 'gm', 'ppc_manager'] }
                                    },
                                    select: { id: true }
                                });

                                if (execUsers.length > 0) {
                                    await this.notificationsService.createSystemNotification(
                                        challan.customerId,
                                        'job_escalation',
                                        'Escalated: Critical Overdue',
                                        `Critical Delay: Job for ${item.partNumber} (Challan ${challan.challanNumber}) is overdue by >3 days.`,
                                        execUsers.map(u => u.id),
                                        {
                                            severity: 'critical',
                                            entityType: 'challan',
                                            entityId: challan.id
                                        }
                                    );
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to check job deadlines', error);
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_11AM)
    async checkPendingInvoices() {
        this.logger.log('Checking for pending invoices...');
        try {
            // Find Inward Challans (Vendor -> Customer) that are Received but not Invoiced
            // Identifying Receiver: CustomerId matches Organization? 
            // For now, assume any challan with status 'received' and NO invoices linked.

            const receivedChallans = await this.prisma.deliveryChallan.findMany({
                where: {
                    status: 'received',
                    invoices: {
                        none: {} // No linked invoice items
                    }
                },
                include: {
                    vendor: true,
                    customer: true,
                    items: true
                }
            });

            for (const challan of receivedChallans) {
                // If it's been received for > 1 day and no invoice
                const oneDayAgo = new Date();
                oneDayAgo.setDate(oneDayAgo.getDate() - 1);

                if (challan.updatedAt < oneDayAgo) { // Assuming updatedAt reflects 'received' status change
                    this.logger.log(`Pending Invoice Prompt: Challan ${challan.challanNumber}`);

                    const vendorUsers = await this.prisma.user.findMany({
                        where: {
                            vendorId: challan.vendorId,
                            isActive: true,
                            // Alert accounts or owner
                            role: { in: ['vendor_owner', 'vendor_ppc'] }
                        },
                        select: { id: true }
                    });

                    if (vendorUsers.length > 0) {
                        await this.notificationsService.createSystemNotification(
                            challan.customerId,
                            'invoice_pending',
                            'Pending Invoice Submission',
                            `Material for Challan ${challan.challanNumber} has been received. Please submit your invoice.`,
                            vendorUsers.map(u => u.id),
                            {
                                severity: 'medium',
                                entityType: 'challan',
                                entityId: challan.id, // Or direct to invoice creation
                                actionUrl: `/dashboard/vendor/invoices/create?challanId=${challan.id}`
                            }
                        );
                    }
                }
            }

        } catch (error) {
            this.logger.error('Failed to check pending invoices', error);
        }
    }
}
