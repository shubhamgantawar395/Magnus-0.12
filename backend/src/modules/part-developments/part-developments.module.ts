import { Module } from '@nestjs/common';
import { PartDevelopmentsService } from './part-developments.service';
import { PartDevelopmentsController } from './part-developments.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PartDevelopmentsController],
    providers: [PartDevelopmentsService],
    exports: [PartDevelopmentsService],
})
export class PartDevelopmentsModule { }
