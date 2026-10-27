import { Module } from '@nestjs/common';
import { VendorRateCardsService } from './vendor-rate-cards.service';
import { VendorRateCardsController } from './vendor-rate-cards.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [VendorRateCardsController],
    providers: [VendorRateCardsService],
    exports: [VendorRateCardsService], // Export service in case PO module needs direct access
})
export class VendorRateCardsModule { }
