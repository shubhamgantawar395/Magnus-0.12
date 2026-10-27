import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { QualityService } from './quality.service';
import { CreateQualityCheckDto } from './dto/create-quality-check.dto';
import { UpdateQualityCheckDto } from './dto/update-quality-check.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, QualityStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Quality Checks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quality-checks')
export class QualityController {
    constructor(private readonly qualityService: QualityService) { }

    @Post()
    @Roles(UserRole.quality_head, UserRole.production_manager, UserRole.ppc_manager)
    @ApiOperation({ summary: 'Create a new quality check' })
    create(@Body() createDto: CreateQualityCheckDto, @CurrentUser() user: any) {
        return this.qualityService.create(createDto, user.id);
    }

    @Get()
    @Roles(
        UserRole.platform_admin,
        UserRole.director,
        UserRole.gm,
        UserRole.executive,
        UserRole.production_manager,
        UserRole.ppc_manager,
        UserRole.quality_head,
    )
    @ApiOperation({ summary: 'List all quality checks with filters' })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'status', required: false, enum: QualityStatus })
    @ApiQuery({ name: 'fromDate', required: false })
    @ApiQuery({ name: 'toDate', required: false })
    findAll(
        @CurrentUser() user: any,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: QualityStatus,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const filters: any = {
            organizationId: user.organizationId,
        };

        if (vendorId) filters.vendorId = vendorId;
        if (status) filters.status = status;
        if (fromDate) filters.fromDate = new Date(fromDate);
        if (toDate) filters.toDate = new Date(toDate);

        return this.qualityService.findAll(filters);
    }

    @Get('statistics')
    @Roles(
        UserRole.platform_admin,
        UserRole.director,
        UserRole.gm,
        UserRole.executive,
        UserRole.production_manager,
        UserRole.quality_head,
    )
    @ApiOperation({ summary: 'Get quality statistics' })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'fromDate', required: false })
    @ApiQuery({ name: 'toDate', required: false })
    getStatistics(
        @CurrentUser() user: any,
        @Query('vendorId') vendorId?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const filters: any = {
            organizationId: user.organizationId,
        };

        if (vendorId) filters.vendorId = vendorId;
        if (fromDate) filters.fromDate = new Date(fromDate);
        if (toDate) filters.toDate = new Date(toDate);

        return this.qualityService.getStatistics(filters);
    }

    @Get('trends')
    @Roles(
        UserRole.platform_admin,
        UserRole.director,
        UserRole.gm,
        UserRole.executive,
        UserRole.production_manager,
        UserRole.quality_head,
    )
    @ApiOperation({ summary: 'Get quality trends over time' })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'fromDate', required: false })
    @ApiQuery({ name: 'toDate', required: false })
    getTrends(
        @CurrentUser() user: any,
        @Query('vendorId') vendorId?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const filters: any = {
            organizationId: user.organizationId,
        };

        if (vendorId) filters.vendorId = vendorId;
        if (fromDate) filters.fromDate = new Date(fromDate);
        if (toDate) filters.toDate = new Date(toDate);

        return this.qualityService.getQualityTrends(filters);
    }

    @Get('defects')
    @Roles(
        UserRole.platform_admin,
        UserRole.director,
        UserRole.gm,
        UserRole.executive,
        UserRole.production_manager,
        UserRole.quality_head,
    )
    @ApiOperation({ summary: 'Get defect distribution' })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'fromDate', required: false })
    @ApiQuery({ name: 'toDate', required: false })
    getDefects(
        @CurrentUser() user: any,
        @Query('vendorId') vendorId?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        const filters: any = {
            organizationId: user.organizationId,
        };

        if (vendorId) filters.vendorId = vendorId;
        if (fromDate) filters.fromDate = new Date(fromDate);
        if (toDate) filters.toDate = new Date(toDate);

        return this.qualityService.getDefectDistribution(filters);
    }

    @Get('vendor/:vendorId/metrics')
    @Roles(
        UserRole.platform_admin,
        UserRole.director,
        UserRole.gm,
        UserRole.executive,
        UserRole.production_manager,
        UserRole.quality_head,
    )
    @ApiOperation({ summary: 'Get quality metrics for a specific vendor' })
    @ApiQuery({ name: 'fromDate', required: false })
    @ApiQuery({ name: 'toDate', required: false })
    getVendorMetrics(
        @Param('vendorId') vendorId: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
    ) {
        return this.qualityService.getVendorQualityMetrics(
            vendorId,
            fromDate ? new Date(fromDate) : undefined,
            toDate ? new Date(toDate) : undefined,
        );
    }

    @Get(':id')
    @Roles(
        UserRole.platform_admin,
        UserRole.director,
        UserRole.gm,
        UserRole.executive,
        UserRole.production_manager,
        UserRole.ppc_manager,
        UserRole.quality_head,
    )
    @ApiOperation({ summary: 'Get quality check details' })
    findOne(@Param('id') id: string) {
        return this.qualityService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.quality_head, UserRole.production_manager)
    @ApiOperation({ summary: 'Update quality check' })
    update(@Param('id') id: string, @Body() updateDto: UpdateQualityCheckDto) {
        return this.qualityService.update(id, updateDto);
    }

    @Get('process/jobs')
    @Roles(UserRole.quality_head, UserRole.quality_supervisor, UserRole.production_manager)
    @ApiOperation({ summary: 'Get list of active job processes for quality check' })
    getQualityJobs(@CurrentUser() user: any) {
        return this.qualityService.getJobsForQuality(user.organizationId);
    }

    @Post('part-operations/:id/pcp')
    @Roles(UserRole.quality_head, UserRole.quality_supervisor)
    @ApiOperation({ summary: 'Upload PCP document for a part operation' })
    uploadPcp(@Param('id') id: string, @Body('pcpUrl') pcpUrl: string) {
        return this.qualityService.uploadPcp(id, pcpUrl);
    }

    @Post('jobs/:id/measurements')
    @Roles(UserRole.quality_head, UserRole.quality_supervisor)
    @ApiOperation({ summary: 'Submit manual measurements for an in-house job process' })
    submitMeasurements(
        @Param('id') id: string,
        @Body('measurements') measurements: any,
        @CurrentUser() user: any
    ) {
        return this.qualityService.submitMeasurements(id, measurements, user.id);
    }

    @Post('jobs/:id/live-check')
    @Roles(UserRole.quality_head, UserRole.quality_supervisor)
    @ApiOperation({ summary: 'Request a live check video call for an outsourced job process' })
    requestLiveCheck(@Param('id') id: string, @Body('link') link: string) {
        return this.qualityService.requestLiveCheck(id, link);
    }
}
