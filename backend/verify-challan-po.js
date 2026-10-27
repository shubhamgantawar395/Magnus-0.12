
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { ChallansService } = require('./dist/src/modules/challans/challans.service');
const { PurchaseOrderService } = require('./dist/src/modules/purchase-orders/purchase-order.service');
const { VendorsService } = require('./dist/src/modules/vendors/vendors.service');
const { PrismaService } = require('./dist/src/prisma/prisma.service');

async function verifyChallanPoLink() {
    console.log('--- Starting Challan PO Linking Verification (JS) ---');

    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const challansService = app.get(ChallansService);

    try {
        // 1. Setup: Ensure we have an Organization and Customer
        let org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        // Get Customer
        const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
        if (!customer) throw new Error("No customer found");

        // Get a User (for createdBy)
        const user = await prisma.user.findFirst({ where: { organizationId: org.id } });
        if (!user) {
            // Create a dummy user if none exists (unlikely in dev)
            console.warn("No user found, this might fail if createdById is foreign key verified");
        }

        // 2. Create/Find Vendor
        let vendor = await prisma.vendor.findFirst({ where: { status: 'approved' } });
        if (!vendor) {
            throw new Error("No approved vendor found. Please seed DB.");
        }

        // 3. Create a PO
        // Note: Enum values like 'with_material' might need to be strings if using raw client
        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber: `PO-TEST-${Date.now()}`,
                poDate: new Date(),
                organizationId: org.id,
                vendorId: vendor.id,
                jobWorkType: 'with_material',
                status: 'approved',
                subtotal: 1000,
                totalAmount: 1180,
                createdById: user ? user.id : 'system',
                items: {
                    create: [
                        {
                            partNumber: 'PART-A',
                            quantity: 100,
                            ratePerPiece: 10,
                            amount: 1000,
                            operations: ['Turning']
                        }
                    ]
                }
            },
            include: { items: true }
        });
        console.log(`✅ PO Created: ${po.poNumber} (${po.id}) with Item: ${po.items[0].id}`);

        // 4. Create Challan Linked to PO
        const challanDto = {
            customerId: customer.id,
            vendorId: vendor.id,
            challanDate: new Date().toISOString(),
            poId: po.id, // LINKING PO
            items: [
                {
                    partNumber: 'PART-A',
                    quantityIssued: 50,
                    poItemId: po.items[0].id, // LINKING ITEM
                    partDescription: 'Part A',
                    hsnCode: '1234',
                    outputPartNumber: 'PART-B',
                    outputDescription: 'Processed Part',
                    unitOfMeasure: 'NOS',
                    materialGrade: 'Steel',
                    drawingReference: 'DWG-001',
                    unitPrice: 10,
                    totalAmount: 500
                }
            ]
        };

        console.log("Creating Challan with PO Link...");
        const challan = await challansService.create(challanDto, user ? user.id : 'system');
        console.log(`✅ Challan Created: ${challan.id}`);

        // 5. Verify Links
        const freshChallan = await prisma.deliveryChallan.findUnique({
            where: { id: challan.id },
            include: { items: true }
        });

        if (freshChallan.poId === po.id) {
            console.log("✅ Challan is correctly linked to PO ID");
        } else {
            console.error("❌ Challan PO ID mismatch");
        }

        if (freshChallan.items[0].poItemId === po.items[0].id) {
            console.log("✅ Challan Item is correctly linked to PO Item ID");
        } else {
            console.error("❌ Challan Item PO Item ID mismatch");
            console.log("Expected:", po.items[0].id);
            console.log("Actual:", freshChallan.items[0].poItemId);
        }

        // Cleanup
        console.log("Cleaning up...");
        await prisma.deliveryChallan.delete({ where: { id: challan.id } });
        await prisma.purchaseOrder.delete({ where: { id: po.id } });
        console.log("✅ Cleanup complete");

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    } finally {
        await app.close();
    }
}

verifyChallanPoLink();
