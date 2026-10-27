import { Module } from '@nestjs/common';
import { CustomerOrdersService } from './customer-orders.service';
import { CustomerOrdersController } from './customer-orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CustomerOrdersController],
    providers: [CustomerOrdersService],
    exports: [CustomerOrdersService],
})
export class CustomerOrdersModule { }
