import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';
import { ExecutiveService } from './executive.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ExecutiveController],
    providers: [ExecutiveService],
})
export class ExecutiveModule { }
