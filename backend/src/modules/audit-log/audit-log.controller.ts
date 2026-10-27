import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) { }

    @Get()
    @Roles('admin', 'executive')
    async findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('entityType') entityType?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.auditLogService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 50,
            {
                userId,
                action,
                entityType,
                startDate,
                endDate,
            },
        );
    }

    @Get('user/:userId')
    @Roles('admin', 'executive')
    async findByUser(
        @Query('userId') userId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.auditLogService.findByUser(
            userId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 50,
        );
    }

    @Get('entity/:entityType/:entityId')
    @Roles('admin', 'executive')
    async findByEntity(
        @Query('entityType') entityType: string,
        @Query('entityId') entityId: string,
    ) {
        return this.auditLogService.findByEntity(entityType, entityId);
    }
}
