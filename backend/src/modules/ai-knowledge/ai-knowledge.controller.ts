import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query,
    UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiKnowledgeService, CreateKnowledgeItemDto, UpdateKnowledgeItemDto, CreateFeedbackDto } from './ai-knowledge.service';

const ADMIN_ROLES = new Set(['admin', 'director', 'gm', 'plant_head']);

@Controller()
@UseGuards(JwtAuthGuard)
export class AiKnowledgeController {
    constructor(private readonly svc: AiKnowledgeService) {}

    // ── Knowledge Items ──────────────────────────────────────────────────────

    @Get('ai-knowledge')
    findAll(
        @Request() req: any,
        @Query('category') category?: string,
        @Query('isActive') isActive?: string,
    ) {
        const orgId = req.user.organizationId;
        const activeFilter = isActive !== undefined ? isActive === 'true' : true;
        return this.svc.findAll(orgId, category, activeFilter);
    }

    @Post('ai-knowledge')
    create(@Request() req: any, @Body() dto: CreateKnowledgeItemDto) {
        return this.svc.create(req.user.organizationId, req.user.id, dto);
    }

    @Patch('ai-knowledge/:id')
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateKnowledgeItemDto,
    ) {
        return this.svc.update(req.user.organizationId, id, dto);
    }

    @Delete('ai-knowledge/:id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.svc.remove(req.user.organizationId, id);
    }

    // ── Feedback ─────────────────────────────────────────────────────────────

    @Post('ai-feedback')
    submitFeedback(@Request() req: any, @Body() dto: CreateFeedbackDto) {
        return this.svc.submitFeedback(req.user.organizationId, req.user.id, dto);
    }

    @Get('ai-feedback')
    getFeedback(@Request() req: any, @Query('rating') rating?: string) {
        const ratingFilter = rating !== undefined ? parseInt(rating, 10) : undefined;
        return this.svc.getFeedback(req.user.organizationId, ratingFilter);
    }
}
