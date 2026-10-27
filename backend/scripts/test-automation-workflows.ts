
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../src/modules/automation/automation.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

const prisma = new PrismaClient();

// Mock NotificationsService
const mockNotificationsService = {
    createSystemNotification: async (orgId: string, type: string, title: string, msg: string, recipients: string[], opts: any) => {
        console.log(`[Email/Alert Sent] Type: ${type} | Title: ${title} | Msg: ${msg} | To: ${recipients.length} users`);
        // Create actual alert in DB for verification
        await prisma.alert.create({
            data: {
                organizationId: orgId,
                type,
                title,
                message: msg,
                recipientIds: recipients,
                severity: opts?.severity || 'low',
                entityType: opts?.entityType,
                entityId: opts?.entityId
            }
        });
        return true;
    }
};

async function main() {
    console.log('🔄 Starting Automation Workflow Test...');

    // 1. Setup Data
    // We need: 
    // - Organization & Vendor (Clean setup or reuse?)
    // - Users (Vendor Owner, Org GM)
    // - Challan (Overdue, Upcoming, Escalated)

    const org = await prisma.organization.findFirst({ where: { name: 'Seinumero Nirman Pvt Ltd' } });
    if (!org) throw new Error('Org not found. Run previous script first.');

    const vendor = await prisma.vendor.findFirst({ where: { companyName: 'Aaniryat Overseas Pvt Limited' } });
    if (!vendor) throw new Error('Vendor not found');

    const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });

    // cleanup test data
    await prisma.alert.deleteMany({ where: { title: { contains: 'Test Automation' } } }); // cleanup old tests if any

    console.log('\n--- 1. Creating Scenario Data ---');

    // 0. Get User ID
    const ppcUser = await prisma.user.findFirst({ where: { role: 'ppc_manager' as any } }) || await prisma.user.findFirst();
    const ppcUserId = ppcUser!.id;

    // Case A: Upcoming Deadline (Due in 1 day)
    // 1. Create PO Item with Schedule
    const poUpcoming = await prisma.purchaseOrder.create({
        data: {
            poNumber: `PO-TEST-UPCOMING-${Date.now()}`,
            poDate: new Date(),
            organizationId: org.id,
            vendorId: vendor.id,
            jobWorkType: 'maesof',
            status: 'approved',
            createdById: ppcUserId,
            subtotal: 0, totalAmount: 0,
            items: {
                create: [{
                    partNumber: 'TEST-PART-1',
                    quantity: 100,
                    ratePerPiece: 10,
                    amount: 1000,
                    deliverySchedule: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
                }]
            }
        },
        include: { items: true }
    });
    const poItemUpcoming = poUpcoming.items[0];

    // 2. Create Challan linked to it
    const upcomingChallan = await prisma.deliveryChallan.create({
        data: {
            challanNumber: `TEST-UPCOMING-${Date.now()}`,
            challanDate: new Date(),
            status: 'issued',
            customerId: customer!.id,
            vendorId: vendor.id,
            totalQuantity: 100,
            createdById: ppcUserId,
            items: {
                create: [{
                    partNumber: 'TEST-PART-1',
                    quantityIssued: 100,
                    poItemId: poItemUpcoming.id
                }]
            }
        }
    });
    console.log(`Created Upcoming Challan: ${upcomingChallan.challanNumber}`);

    // Case B: Escalated Overdue (Due 5 days ago)
    const poEscalated = await prisma.purchaseOrder.create({
        data: {
            poNumber: `PO-TEST-ESCALATED-${Date.now()}`,
            poDate: new Date(),
            organizationId: org.id,
            vendorId: vendor.id,
            jobWorkType: 'maesof',
            status: 'approved',
            createdById: ppcUserId,
            subtotal: 0, totalAmount: 0,
            items: {
                create: [{
                    partNumber: 'TEST-PART-2',
                    quantity: 100,
                    ratePerPiece: 10,
                    amount: 1000,
                    deliverySchedule: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
                }]
            }
        },
        include: { items: true }
    });
    const poItemEscalated = poEscalated.items[0];

    const escalatedChallan = await prisma.deliveryChallan.create({
        data: {
            challanNumber: `TEST-ESCALATED-${Date.now()}`,
            challanDate: new Date(),
            status: 'issued',
            customerId: customer!.id,
            vendorId: vendor.id,
            totalQuantity: 100,
            createdById: (poUpcoming as any).createdById,
            items: {
                create: [{
                    partNumber: 'TEST-PART-2',
                    quantityIssued: 100,
                    poItemId: poItemEscalated.id
                }]
            }
        }
    });
    console.log(`Created Escalated Challan: ${escalatedChallan.challanNumber}`);

    // Case C: Pending Invoice (Received 2 days ago, no invoice)
    const receivedChallan = await prisma.deliveryChallan.create({
        data: {
            challanNumber: `TEST-RECEIVED-${Date.now()}`,
            challanDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            status: 'received',
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Received 2 days ago
            customerId: customer!.id,
            vendorId: vendor.id,
            totalQuantity: 100,
            createdById: (await prisma.user.findFirst({ where: { role: 'vendor_owner' as any } }))?.id || (await prisma.user.findFirst())!.id,
            // No invoices linked
            items: { // Needs at least one item
                create: [{
                    partNumber: 'TEST-PART-3',
                    quantityIssued: 100
                }]
            }
        }
    });
    console.log(`Created Received Challan: ${receivedChallan.challanNumber}`);


    // 2. Instantiate Service
    const service = new AutomationService(prisma as any, mockNotificationsService as any);
    (service as any).logger = new Logger('TestAutomation');

    // 3. Run Workflows
    console.log('\n--- 2. Running Automation Service ---');

    console.log('>> Running handleJobDeadlines()...');
    await service.handleJobDeadlines();

    console.log('>> Running checkPendingInvoices()...');
    await service.checkPendingInvoices();

    // 4. Verify Results
    console.log('\n--- 3. Verifying Alerts ---');

    // Verify Upcoming
    const alertUpcoming = await prisma.alert.findFirst({
        where: {
            entityId: upcomingChallan.id,
            type: 'job_deadline_approaching'
        }
    });
    console.log(`Upcoming Alert: ${alertUpcoming ? '✅ Found' : '❌ Missing'}`);

    // Verify Escalated (Should have Overdue AND Escalation?)
    const alertOverdue = await prisma.alert.findFirst({
        where: {
            entityId: escalatedChallan.id,
            type: 'job_overdue'
        }
    });
    const alertEscalated = await prisma.alert.findFirst({
        where: {
            entityId: escalatedChallan.id,
            type: 'job_escalation'
        }
    });
    console.log(`Overdue Alert: ${alertOverdue ? '✅ Found' : '❌ Missing'}`);
    console.log(`Escalation Alert: ${alertEscalated ? '✅ Found' : '❌ Missing'}`);

    // Verify Pending Invoice
    const alertInvoice = await prisma.alert.findFirst({
        where: {
            entityId: receivedChallan.id,
            type: 'invoice_pending'
        }
    });
    console.log(`Pending Invoice Alert: ${alertInvoice ? '✅ Found' : '❌ Missing'}`);

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
