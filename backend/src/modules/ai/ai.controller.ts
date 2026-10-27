import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post('chat')
    @ApiOperation({ summary: 'Process natural language query' })
    async chat(@Req() req, @Body() body: { prompt: string }) {
        return this.aiService.processChat(body.prompt, req.user);
    }
}
