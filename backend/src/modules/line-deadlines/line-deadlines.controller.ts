import { Controller, Get, Patch, Post, Query, Body, Request, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LineDeadlinesService, UpsertLineDeadlineDto } from './line-deadlines.service';

const EXEC_ROLES: UserRole[] = [
    UserRole.platform_admin,
    UserRole.admin,
    UserRole.director,
    UserRole.gm,
    UserRole.executive,
    UserRole.production_manager,
    UserRole.ppc_manager,
    UserRole.plant_head,
];

@Controller('line-deadlines')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LineDeadlinesController {
    constructor(private readonly svc: LineDeadlinesService) { }

    /**
     * GET /line-deadlines?month=3&year=2026
     * Returns all lines with live WIP/dispatched and stored targets for the month.
     */
    @Get()
    @Roles(...EXEC_ROLES)
    async getMonthData(
        @Query('month', ParseIntPipe) month: number,
        @Query('year', ParseIntPipe) year: number,
        @Request() req: any,
    ) {
        const orgId = req.user.organizationId;
        return this.svc.getMonthData(orgId, month, year);
    }

    /**
     * PATCH /line-deadlines/upsert
     * Body: { items: UpsertLineDeadlineDto[] }
     * Saves targets for one or many (customer, part) rows in one call.
     */
    @Patch('upsert')
    @Roles(...EXEC_ROLES)
    async upsertTargets(
        @Body() body: { items: UpsertLineDeadlineDto[] },
        @Request() req: any,
    ) {
        const orgId = req.user.organizationId;
        return this.svc.upsertTargets(orgId, body.items);
    }

    /**
     * POST /line-deadlines/add-part
     * Manually add a part number to a customer's line for a given month.
     */
    @Post('add-part')
    @Roles(...EXEC_ROLES)
    async addPart(
        @Body() dto: UpsertLineDeadlineDto,
        @Request() req: any,
    ) {
        const orgId = req.user.organizationId;
        return this.svc.addPartToLine(orgId, dto);
    }
}
