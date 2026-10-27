import { Module } from '@nestjs/common';
import { StockStatementsService } from './stock-statements.service';
import { StockStatementsController } from './stock-statements.controller';
import { StockStatementsGateway } from './stock-statements.gateway';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [StockStatementsController],
    providers: [StockStatementsService, StockStatementsGateway],
    exports: [StockStatementsService, StockStatementsGateway],
})
export class StockStatementsModule { }
