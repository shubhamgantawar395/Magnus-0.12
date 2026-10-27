import { Controller, Get, Post, Put, Body, UseGuards, Req, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ExecutiveService } from './executive.service';
import { CreateDispatchDeadlineDto } from './dto/create-dispatch-deadline.dto';
import { UserRole } from '@prisma/client';

@ApiTags('Executive Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('executive')
export class ExecutiveController {
    constructor(private readonly executiveService: ExecutiveService) { }

    @Post('dispatch-deadlines')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Create manual dispatch deadline' })
    createDispatchDeadline(@Body() createDto: CreateDispatchDeadlineDto) {
        return this.executiveService.createDispatchDeadline(createDto);
    }

    @Get('stats')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get high-level dashboard statistics' })
    getStats(@Req() req) {
        return this.executiveService.getStats(req.user.organizationId);
    }

    @Get('stock-statement')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get aggregated stock statement' })
    getStockStatement(@Req() req) {
        return this.executiveService.getStockStatement(req.user.organizationId);
    }

    @Get('vendor-performance')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get vendor performance ranking' })
    getVendorPerformance(@Req() req) {
        return this.executiveService.getVendorPerformance(req.user.organizationId);
    }

    @Get('dispatch-deadlines')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get upcoming dispatch deadlines' })
    getDispatchDeadlines(@Req() req) {
        return this.executiveService.getDispatchDeadlines(req.user.organizationId);
    }
    @Get('spend-analysis')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get monthly spend analysis' })
    getSpendAnalysis(@Req() req) {
        return this.executiveService.getSpendAnalysis(req.user.organizationId);
    }

    @Get('performance-trends')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get overall vendor performance trends' })
    getVendorPerformanceTrends(@Req() req) {
        return this.executiveService.getVendorPerformanceTrends(req.user.organizationId);
    }

    @Get('vendor-analytics/:vendorId')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get detailed vendor analytics' })
    getVendorDetails(@Req() req, @Param('vendorId') vendorId: string) {
        return this.executiveService.getVendorDetails(req.user.organizationId, vendorId);
    }

    @Get('vendor-comparison')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get vendor comparison matrix' })
    getVendorComparison(@Req() req) {
        return this.executiveService.getVendorComparison(req.user.organizationId);
    }

    @Get('cost-analysis')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer)
    @ApiOperation({ summary: 'Get cost analysis data' })
    getCostAnalysis(@Req() req) {
        return this.executiveService.getCostAnalysis(req.user.organizationId);
    }

    @Get('part-overview')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer, UserRole.ppc_manager, UserRole.production_manager)
    @ApiOperation({ summary: 'War Room: per-customer health cards + global KPIs' })
    getPartStatusOverview(@Req() req) {
        return this.executiveService.getPartStatusOverview(req.user.organizationId);
    }

    @Get('part-tracker')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer, UserRole.ppc_manager, UserRole.production_manager)
    @ApiOperation({ summary: 'Part tracker with process pipeline. Filter by customerId, vendorId, partNumber, status' })
    getPartTracker(
        @Req() req,
        @Query('customerId') customerId?: string,
        @Query('vendorId') vendorId?: string,
        @Query('partNumber') partNumber?: string,
        @Query('status') status?: 'raw' | 'wip' | 'finished' | 'dispatched' | 'overdue' | 'at_risk'
    ) {
        return this.executiveService.getPartTracker(req.user.organizationId, { customerId, vendorId, partNumber, status });
    }

    @Get('parts/customer/:customerId')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin, UserRole.customer, UserRole.ppc_manager, UserRole.production_manager)
    @ApiOperation({ summary: 'Get all parts for a specific OEM customer (drill-down)' })
    getCustomerParts(@Req() req, @Param('customerId') customerId: string) {
        return this.executiveService.getCustomerParts(req.user.organizationId, customerId);
    }

    @Put('parts/:challanItemId/deadline')
    @Roles(UserRole.platform_admin, UserRole.executive, UserRole.director, UserRole.gm, UserRole.admin)
    @ApiOperation({ summary: 'Executive sets a custom deadline on a challan item / part' })
    setPartDeadline(
        @Req() req,
        @Param('challanItemId') challanItemId: string,
        @Body() body: { deadline: string; note?: string }
    ) {
        return this.executiveService.setPartDeadline(challanItemId, req.user.organizationId, body);
    }

    @Get('morning-briefing')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.executive, UserRole.admin)
    @ApiOperation({ summary: 'Director morning briefing — all KPIs, pending approvals, material in transit' })
    getMorningBriefing(@Req() req) {
        return this.executiveService.getMorningBriefing(req.user.organizationId);
    }

    @Get('war-room')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.executive, UserRole.admin)
    @ApiOperation({ summary: 'Executive War Room — live KPIs, overdue vendors, 7-day dispatch volume' })
    getWarRoom(@Req() req) {
        return this.executiveService.getWarRoom(req.user.organizationId);
    }
}
