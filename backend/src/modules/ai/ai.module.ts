import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiContextService } from './ai-context.service';
import { AiActionsService } from './ai-actions.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';
import { ChallansModule } from '../challans/challans.module';
import { TrayModule } from '../trays/tray.module';
import { CustomersModule } from '../customers/customers.module';
import { VendorsModule } from '../vendors/vendors.module';
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module';
import { VendorInvoiceModule } from '../vendor-invoices/vendor-invoice.module';
import { AiKnowledgeModule } from '../ai-knowledge/ai-knowledge.module';

@Module({
    imports: [
        PrismaModule,
        JobsModule,
        ChallansModule,
        TrayModule,
        CustomersModule,
        VendorsModule,
        PurchaseOrdersModule,
        VendorInvoiceModule,
        AiKnowledgeModule,
    ],
    controllers: [AiController],
    providers: [AiService, AiContextService, AiActionsService],
    exports: [AiService],
})
export class AiModule { }