import { Module } from '@nestjs/common';
import { GatePassesController } from './gate-passes.controller';
import { GatePassesService } from './gate-passes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [GatePassesController],
    providers: [GatePassesService],
    exports: [GatePassesService],
})
export class GatePassesModule { }
