import { Module } from '@nestjs/common';
import { VendorInvoiceService } from './vendor-invoice.service';
import { VendorInvoiceController } from './vendor-invoice.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, CommonModule, NotificationsModule],
    controllers: [VendorInvoiceController],
    providers: [VendorInvoiceService],
    exports: [VendorInvoiceService]
})
export class VendorInvoiceModule { }
