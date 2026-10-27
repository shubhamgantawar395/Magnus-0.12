import { Module } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [MachinesController],
    providers: [MachinesService],
    exports: [MachinesService],
})
export class MachinesModule { }
