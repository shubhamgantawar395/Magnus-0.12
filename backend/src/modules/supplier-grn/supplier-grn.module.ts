import { Module } from '@nestjs/common';
import { SupplierGRNController } from './supplier-grn.controller';
import { SupplierGRNService } from './supplier-grn.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SupplierGRNController],
    providers: [SupplierGRNService],
    exports: [SupplierGRNService],
})
export class SupplierGRNModule {}
