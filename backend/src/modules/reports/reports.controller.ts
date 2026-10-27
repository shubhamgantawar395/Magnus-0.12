import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// All internal org roles can view stock statements
const ALL_ORG_ROLES = [
    UserRole.admin, UserRole.director, UserRole.gm, UserRole.executive,
    UserRole.plant_head, UserRole.production_manager, UserRole.ppc_manager,
    UserRole.quality_head, UserRole.quality_supervisor,
    UserRole.accounts_manager, UserRole.store_keeper,
];

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('stock-statement')
    @Roles('admin', 'customer', 'vendor')
    @ApiOperation({ summary: 'Get monthly stock statement for vendor' })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    async getStockStatement(
        @Query('vendorId') vendorId: string,
        @Query('month') month: string,
        @Query('year') year: string,
        @Request() req
    ) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) {
            throw new BadRequestException('Invalid month or year');
        }

        const targetVendorId = req.user.role === 'vendor' ? req.user.vendorId : vendorId;

        if (!targetVendorId) {
            throw new BadRequestException('Vendor ID is required');
        }

        return this.reportsService.getStockStatement(targetVendorId, monthNum, yearNum);
    }

    @Get('vendor-performance')
    @Roles('admin', 'customer')
    @ApiOperation({ summary: 'Get vendor performance metrics' })
    @ApiQuery({ name: 'vendorId', required: true, type: String })
    @ApiQuery({ name: 'startDate', required: true, type: String })
    @ApiQuery({ name: 'endDate', required: true, type: String })
    async getVendorPerformance(
        @Query('vendorId') vendorId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        if (!vendorId || !startDate || !endDate) {
            throw new BadRequestException('vendorId, startDate, and endDate are required');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new BadRequestException('Invalid date format');
        }

        return this.reportsService.getVendorPerformance(vendorId, start, end);
    }

    // ─── Vendor Wise Stock Statement ──────────────────────────────────────────

    @Get('vendor-wise-stock')
    @Roles(...ALL_ORG_ROLES)
    @ApiOperation({ summary: 'Vendor Wise Stock Statement — per challan breakdown with rejections & WIP' })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'dateFrom', required: false, type: String })
    @ApiQuery({ name: 'dateTo', required: false, type: String })
    @ApiQuery({ name: 'materialType', required: false, type: String })
    async getVendorWiseStock(
        @Request() req,
        @Query('vendorId') vendorId?: string,
        @Query('search') search?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('materialType') materialType?: string,
    ) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new BadRequestException('Organization context required');
        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;
        return this.reportsService.getVendorWiseStockStatement(orgId, vendorId, search, from, to, materialType);
    }

    // ─── Global Stock Statement (Part-centric) ────────────────────────────────

    @Get('global-stock')
    @Roles(...ALL_ORG_ROLES)
    @ApiOperation({ summary: 'Global Stock Statement — part-centric with customer demand, vendor breakdown, and live balance' })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'endCustomerId', required: false, type: String, description: 'Filter by Tier-1 OEM customer' })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'dateFrom', required: false, type: String })
    @ApiQuery({ name: 'dateTo', required: false, type: String })
    async getGlobalStock(
        @Request() req,
        @Query('search') search?: string,
        @Query('endCustomerId') endCustomerId?: string,
        @Query('vendorId') vendorId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        const orgId = req.user.organizationId;
        if (!orgId) throw new BadRequestException('Organization context required');
        const from = dateFrom ? new Date(dateFrom) : undefined;
        const to = dateTo ? new Date(dateTo) : undefined;
        return this.reportsService.getGlobalStockStatement(orgId, search, endCustomerId, vendorId, from, to);
    }
}
