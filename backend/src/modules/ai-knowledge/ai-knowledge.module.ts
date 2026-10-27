import { Module } from '@nestjs/common';
import { AiKnowledgeController } from './ai-knowledge.controller';
import { AiKnowledgeService } from './ai-knowledge.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AiKnowledgeController],
    providers: [AiKnowledgeService],
    exports: [AiKnowledgeService],
})
export class AiKnowledgeModule {}
