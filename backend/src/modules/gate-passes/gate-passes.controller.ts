import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { GatePassesService } from './gate-passes.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Gate Passes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('gate-passes')
export class GatePassesController {
    constructor(private readonly service: GatePassesService) { }

    @Post()
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper')
    @ApiOperation({ summary: 'Issue a new visitor gate pass' })
    create(@Body() dto: any, @Request() req) {
        return this.service.create(dto, req.user.id, req.user.organizationId);
    }

    @Get()
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper', 'executive')
    @ApiOperation({ summary: 'List gate passes with optional filters' })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'date', required: false })
    findAll(
        @Request() req,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('date') date?: string,
    ) {
        return this.service.findAll(req.user.organizationId, { status, search, date });
    }

    @Get('stats')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'executive')
    @ApiOperation({ summary: 'Get gate pass dashboard stats' })
    getStats(@Request() req) {
        return this.service.getStats(req.user.organizationId);
    }

    @Get(':id')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper')
    @ApiOperation({ summary: 'Get a single gate pass' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organizationId);
    }

    @Post(':id/exit')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper')
    @ApiOperation({ summary: 'Mark visitor exit' })
    markExit(@Param('id') id: string, @Body('remarks') remarks: string, @Request() req) {
        return this.service.markExit(id, req.user.organizationId, remarks);
    }

    @Patch(':id')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director')
    @ApiOperation({ summary: 'Update a gate pass' })
    update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        return this.service.update(id, dto, req.user.organizationId);
    }

    // ── Visitor's Register ─────────────────────────────────────────────────────
    @Get('register')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'executive')
    @ApiOperation({ summary: "Get visitor's register for a date range" })
    @ApiQuery({ name: 'startDate', required: false, example: '2026-03-26' })
    @ApiQuery({ name: 'endDate', required: false })
    getVisitorRegister(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.service.getVisitorRegister(req.user.organizationId, startDate, endDate);
    }

    @Get('register/export')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'executive')
    @ApiOperation({ summary: "Export visitor's register as Excel" })
    async exportVisitorRegister(
        @Request() req,
        @Res() res: Response,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const buffer = await this.service.exportVisitorRegisterExcel(req.user.organizationId, startDate, endDate);
        const filename = `Visitors_Register_${startDate || 'today'}.xlsx`;
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }

    // ── Material In/Out Register ───────────────────────────────────────────────
    @Get('material-register')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Get material in/out register for a date range' })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getMaterialRegister(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.service.getMaterialRegister(req.user.organizationId, startDate, endDate);
    }

    @Get('material-register/export')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Export material in/out register as Excel' })
    async exportMaterialRegister(
        @Request() req,
        @Res() res: Response,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const buffer = await this.service.exportMaterialRegisterExcel(req.user.organizationId, startDate, endDate);
        const filename = `Material_Register_${startDate || 'today'}.xlsx`;
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
}
