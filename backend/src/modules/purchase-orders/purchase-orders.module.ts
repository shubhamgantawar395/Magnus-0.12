import { Module } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [PrismaModule, CommonModule, NotificationsModule],
    controllers: [PurchaseOrdersController],
    providers: [PurchaseOrdersService],
    exports: [PurchaseOrdersService]
})
export class PurchaseOrdersModule { }
