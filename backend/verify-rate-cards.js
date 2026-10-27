
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/src/app.module');
const { VendorRateCardsService } = require('./dist/src/modules/vendor-rate-cards/vendor-rate-cards.service');
const { VendorsService } = require('./dist/src/modules/vendors/vendors.service');
const { PrismaService } = require('./dist/src/prisma/prisma.service');

async function verifyRateCards() {
    console.log('--- Starting Vendor Rate Card Verification (JS) ---');

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
        // Bypassing TS errors
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
        // findActive returns a single object (Promise<VendorRateCard>)
        const activeCard = await rateCardService.findActive(vendor.id, 'Turning');

        if (activeCard && Number(activeCard.baseRate) === 150.00) {
            console.log(`✅ Active Rate Card Found: ${activeCard.operationType} - Rate: ${activeCard.baseRate}`);
        } else {
            console.error('❌ Failed to fetch active rate card correctly.');
            console.log(`Result:`, activeCard);
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
