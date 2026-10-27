import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { MaterialReceiptsService } from './material-receipts.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Material Receipts')
@ApiBearerAuth()
@Controller('material-receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialReceiptsController {
    constructor(private readonly service: MaterialReceiptsService) { }

    // ── Open challans waiting for gate receipt ─────────────────────────────────
    @Get('open-challans')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper', 'quality_supervisor', 'ppc_manager')
    @ApiOperation({ summary: 'List open challans pending gate receipt' })
    @ApiQuery({ name: 'vendorId', required: false })
    getOpenChallans(@Request() req, @Query('vendorId') vendorId?: string) {
        return this.service.getOpenChallans(req.user.organizationId, vendorId);
    }

    @Post()
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper', 'quality_supervisor', 'ppc_manager')
    @ApiOperation({ summary: 'Record gate-in material receipt (auto-generates GRN)' })
    create(@Body() dto: any, @Request() req) {
        return this.service.create(dto, req.user.id, req.user.organizationId);
    }

    @Get()
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper', 'quality_supervisor', 'ppc_manager', 'production_manager', 'executive')
    @ApiOperation({ summary: 'List all material receipts' })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'status', required: false })
    findAll(
        @Request() req,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: string,
    ) {
        return this.service.findAll(req.user.organizationId, { vendorId, status });
    }

    @Get(':id')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper', 'quality_supervisor', 'ppc_manager')
    @ApiOperation({ summary: 'Get material receipt details' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'store_keeper')
    @ApiOperation({ summary: 'Update material receipt' })
    update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        return this.service.update(id, dto, req.user.organizationId);
    }

    @Post(':id/inspect')
    @Roles('security', 'admin', 'platform_admin', 'gm', 'director', 'quality_supervisor')
    @ApiOperation({ summary: 'Complete gate inspection and set status' })
    inspect(
        @Param('id') id: string,
        @Body('status') status: string,
        @Body('remarks') remarks: string,
        @Request() req,
    ) {
        return this.service.inspect(id, status, req.user.organizationId, remarks);
    }

    @Delete(':id')
    @Roles('admin', 'platform_admin', 'gm', 'director')
    @ApiOperation({ summary: 'Delete receipt (admin only)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.service.remove(id, req.user.organizationId);
    }
}
