import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LineDeadlinesController } from './line-deadlines.controller';
import { LineDeadlinesService } from './line-deadlines.service';

@Module({
    imports: [PrismaModule],
    controllers: [LineDeadlinesController],
    providers: [LineDeadlinesService],
    exports: [LineDeadlinesService],
})
export class LineDeadlinesModule {}
