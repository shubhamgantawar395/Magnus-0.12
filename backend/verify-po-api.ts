import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PurchaseOrdersService } from './src/modules/purchase-orders/purchase-orders.service';
import { CreatePurchaseOrderDto } from './src/modules/purchase-orders/dto/create-po.dto';
import { JobWorkType, POStatus } from '@prisma/client';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const poService = app.get(PurchaseOrdersService);
    const prisma = app.get(PrismaService);

    console.log('🚀 Starting PO API Verification...');

    // 1. Get Default Org and User
    const org = await prisma.organization.findUnique({ where: { code: 'AANIRY001' } });
    const user = await prisma.user.findFirst({ where: { organizationId: org.id, role: 'production_manager' } });
    const vendor = await prisma.vendor.findFirst({ where: { organizationId: org.id } });

    if (!org || !user || !vendor) {
        console.error('❌ Missing prerequisite data (Org, User, or Vendor)');
        process.exit(1);
    }

    // 2. Create PO
    console.log('📝 Creating Purchase Order...');
    const createDto: CreatePurchaseOrderDto = {
        poDate: new Date(),
        vendorId: vendor.id,
        jobWorkType: JobWorkType.with_material,
        items: [
            {
                partNumber: 'TEST-PART-001',
                quantity: 100,
                ratePerPiece: 50,
                operations: ['Turning']
            }
        ]
    };

    const po = await poService.create(createDto, user.id, org.id);
    console.log(`✅ PO Created: ${po.poNumber} (ID: ${po.id})`);
    console.log(`   - Status: ${po.status}`);
    console.log(`   - Total Amount: ${po.totalAmount}`);

    // 3. List POs
    console.log('📋 Listing POs...');
    const pos = await poService.findAll(org.id) as any;
    console.log(`✅ Found ${(pos.data ?? pos).length} POs`);

    // 4. Get PO Details
    console.log('🔍 Getting PO Details...');
    const poDetails = await poService.findOne(po.id, org.id);
    console.log(`✅ Retrieved PO ${poDetails.poNumber} with ${poDetails.items.length} items`);

    console.log('✨ Verification Successful!');
    await app.close();
}

bootstrap();
