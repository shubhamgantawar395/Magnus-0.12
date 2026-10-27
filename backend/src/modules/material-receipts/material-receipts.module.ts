import { Module } from '@nestjs/common';
import { MaterialReceiptsService } from './material-receipts.service';
import { MaterialReceiptsController } from './material-receipts.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MaterialReceiptsController],
    providers: [MaterialReceiptsService],
    exports: [MaterialReceiptsService],
})
export class MaterialReceiptsModule { }
