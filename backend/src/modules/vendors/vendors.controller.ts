import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorCapabilityDto } from './dto/vendor-capability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VendorStatus } from '@prisma/client';

@ApiTags('vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendors')
export class VendorsController {
    constructor(private readonly vendorsService: VendorsService) { }

    @Post()
    @Roles('admin', 'platform_admin', 'director', 'gm', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Create a new vendor' })
    create(@Body() createVendorDto: CreateVendorDto, @Request() req) {
        console.log(`VendorsController.Create: UserID=${req.user.id}, OrgID=${req.user.organizationId}`);
        return this.vendorsService.create(createVendorDto, req.user.id, req.user.organizationId);
    }

    @Get('marketplace')
    @Roles('admin', 'platform_admin', 'director', 'gm', 'ppc_manager')
    @ApiOperation({ summary: 'Discover global vendors' })
    @ApiQuery({ name: 'search', required: false, type: String })
    findMarketplaceVendors(@Query('search') search: string, @Request() req) {
        return this.vendorsService.findMarketplaceVendors(req.user.organizationId, search);
    }

    @Post('marketplace/:id/link')
    @Roles('admin', 'platform_admin', 'director', 'gm', 'ppc_manager')
    @ApiOperation({ summary: 'Link an organization to a global vendor' })
    requestVendorLink(@Param('id') vendorId: string, @Request() req) {
        return this.vendorsService.requestVendorLink(vendorId, req.user.organizationId);
    }

    @Get()
    @Roles('admin', 'customer', 'vendor', 'platform_admin', 'director', 'gm', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Get all vendors' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'customerId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: VendorStatus })
    @ApiQuery({ name: 'search', required: false, type: String })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('customerId') customerId?: string,
        @Query('status') status?: VendorStatus,
        @Query('search') search?: string,
        @Request() req = {} as any
    ) {
        return this.vendorsService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            req.user.organizationId,
            customerId,
            status,
            search
        );
    }

    @Get('jobs')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor')
    @ApiOperation({ summary: 'Get jobs assigned to vendor' })
    getVendorJobs(@Request() req) {
        return this.vendorsService.getVendorJobs(req.user.vendorId);
    }

    @Get('me/dispatch-summary')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor')
    @ApiOperation({ summary: 'Get dispatch summary for logged-in vendor' })
    getMyDispatchSummary(@Request() req) {
        return this.vendorsService.getVendorDispatchSummary(req.user.vendorId);
    }

    @Get('me/analytics')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor')
    @ApiOperation({ summary: 'Get analytics for logged-in vendor' })
    getMyAnalytics(@Request() req) {
        return this.vendorsService.getVendorAnalytics(req.user.vendorId);
    }

    @Get('readiness')
    @Roles('admin', 'platform_admin', 'director', 'gm', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Get readiness scores for all vendors in org' })
    getReadinessAll(@Request() req) {
        return this.vendorsService.getReadinessAll(req.user.organizationId);
    }

    @Get(':id/readiness')
    @Roles('admin', 'platform_admin', 'director', 'gm', 'ppc_manager', 'executive', 'production_manager')
    @ApiOperation({ summary: 'Get readiness score for a specific vendor' })
    getReadiness(@Param('id') id: string) {
        return this.vendorsService.getReadinessScore(id);
    }

    @Get(':id')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive', 'quality_head', 'quality_supervisor', 'plant_head', 'store_keeper', 'accounts_manager')
    @ApiOperation({ summary: 'Get vendor by ID' })
    findOne(@Param('id') id: string) {
        return this.vendorsService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'executive', 'ppc_manager', 'production_manager', 'plant_head', 'vendor_owner')
    @ApiOperation({ summary: 'Update vendor' })
    update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
        return this.vendorsService.update(id, updateVendorDto);
    }

    @Post(':id/approve')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager')
    @ApiOperation({ summary: 'Approve vendor' })
    approve(@Param('id') id: string, @Request() req) {
        return this.vendorsService.approve(id, req.user.id);
    }

    @Post(':id/suspend')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm')
    @ApiOperation({ summary: 'Suspend vendor' })
    suspend(@Param('id') id: string) {
        return this.vendorsService.suspend(id);
    }

    @Post(':id/capabilities')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'director', 'gm', 'ppc_manager', 'executive', 'production_manager', 'plant_head')
    @ApiOperation({ summary: 'Add vendor capability' })
    addCapability(
        @Param('id') id: string,
        @Body() capabilityDto: VendorCapabilityDto
    ) {
        return this.vendorsService.addCapability(id, capabilityDto);
    }

    @Get(':id/capabilities')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive')
    @ApiOperation({ summary: 'Get vendor capabilities' })
    getCapabilities(@Param('id') id: string) {
        return this.vendorsService.getCapabilities(id);
    }

    @Delete('capabilities/:capabilityId')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager', 'executive', 'production_manager', 'plant_head')
    @ApiOperation({ summary: 'Remove vendor capability' })
    removeCapability(@Param('capabilityId') capabilityId: string) {
        return this.vendorsService.removeCapability(capabilityId);
    }

    @Delete(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete vendor' })
    remove(@Param('id') id: string) {
        return this.vendorsService.remove(id);
    }
}
