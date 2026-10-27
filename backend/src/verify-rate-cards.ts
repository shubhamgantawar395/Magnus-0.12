// @ts-nocheck
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VendorRateCardsService } from './modules/vendor-rate-cards/vendor-rate-cards.service';
import { VendorsService } from './modules/vendors/vendors.service';
import { PrismaService } from './prisma/prisma.service';

async function verifyRateCards() {
    console.log('--- Starting Vendor Rate Card Verification ---');

    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const rateCardService = app.get(VendorRateCardsService);
    const vendorsService = app.get(VendorsService);

    try {
        // 1. Setup: Ensure we have an Organization and Customer
        let org = await prisma.organization.findFirst();
        if (!org) {
            throw new Error("No organization found. Please seed the database first.");
        }
        console.log(`Using Organization: ${org.name} (${org.id})`);

        const customer = await prisma.customer.findFirst({ where: { organizationId: org.id } });
        if (!customer) throw new Error("No customer found. Please seed the database first.");

        // 2. Create a Test Vendor
        const uniqueCode = `V-${Date.now()}`;
        const vendorData = {
            companyName: `Test Vendor ${uniqueCode}`,
            vendorCode: uniqueCode,
            contactEmail: `vendor-${uniqueCode}@test.com`,
            contactPhone: '1234567890',
            address: '123 Test St',
            city: 'Test City',
            state: 'Test State',
            pincode: '123456',
            gstin: '29ABCDE1234F1Z5',
            customerId: customer.id,
        };

        console.log(`Creating Vendor: ${vendorData.companyName}`);
        const vendor = await vendorsService.create(vendorData);
        console.log(`✅ Vendor Created: ${vendor.id}`);

        // 3. Create a Rate Card
        const rateCardData = {
            operationType: 'Turning',
            rateType: 'per_piece',
            baseRate: 150.00,
            minimumCharge: 500,
            effectiveFrom: new Date(),
        };

        console.log(`Creating Rate Card: ${rateCardData.operationType} @ ${rateCardData.baseRate}`);
        const rateCard = await rateCardService.create(vendor.id, rateCardData);
        console.log(`✅ Rate Card Created: ${rateCard.id}`);

        // 4. Verify Active Rate Card Fetch
        console.log('Fetching Active Rate Cards for "Turning"...');
        const activeCards = await rateCardService.findActive(vendor.id, 'Turning');

        // Check if returns plain object or array, service returns findFirst which is object, OR findMany?
        // Service findActive returns findFirst (single object) or findMany (array)? 
        // Step 919: findActive returns prisma.vendorRateCard.findFirst(...) -> Single object!
        // My previous script checked activeCards.length which implies array.
        // If it returns single object, activeCards.length will be undefined.

        if (activeCards && Number(activeCards.baseRate) === 150.00) {
            console.log(`✅ Active Rate Card Found: ${activeCards.operationType} - Rate: ${activeCards.baseRate}`);
        } else {
            console.error('❌ Failed to fetch active rate card correctly.');
            console.log(`Result:`, activeCards);
        }

        // 5. Cleanup
        console.log('Cleaning up test data...');
        try {
            await rateCardService.remove(vendor.id, rateCard.id);
            await vendorsService.remove(vendor.id);
        } catch (e) {
            console.warn('Cleanup warning:', e.message);
        }
        console.log('✅ Cleanup Complete');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        console.error(error);
    } finally {
        await app.close();
    }
}

verifyRateCards();
