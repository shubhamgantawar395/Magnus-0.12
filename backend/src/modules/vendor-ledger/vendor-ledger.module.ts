import { Module } from '@nestjs/common';
import { VendorLedgerService } from './vendor-ledger.service';
import { VendorLedgerController } from './vendor-ledger.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [VendorLedgerController],
    providers: [VendorLedgerService],
    exports: [VendorLedgerService],
})
export class VendorLedgerModule { }
