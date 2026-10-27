import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Query,
    Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobProcessDto } from './dto/create-job-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProcessStatus } from '@prisma/client';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) { }

    @Post('challan-items/:id/processes')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager', 'production_manager')
    @ApiOperation({ summary: 'Create process workflow for a challan item' })
    createProcessWorkflow(
        @Param('id') challanItemId: string,
        @Body() processes: CreateJobProcessDto[]
    ) {
        return this.jobsService.createProcessWorkflow(challanItemId, processes);
    }

    @Get('processes')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive', 'quality_head', 'quality_supervisor', 'plant_head')
    @ApiOperation({ summary: 'Get all job processes' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ProcessStatus })
    @ApiQuery({ name: 'search', required: false, type: String })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: ProcessStatus,
        @Query('search') search?: string
    ) {
        return this.jobsService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            vendorId,
            status,
            search
        );
    }

    @Get('processes/:id')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive', 'quality_head', 'quality_supervisor', 'plant_head')
    @ApiOperation({ summary: 'Get job process by ID' })
    findOne(@Param('id') id: string) {
        return this.jobsService.findOne(id);
    }

    @Post('processes/:id/update')
    @Roles('admin', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor')
    @ApiOperation({ summary: 'Update process quantities (vendor action)' })
    updateProcess(
        @Param('id') id: string,
        @Body() updateDto: UpdateProcessDto,
        @Request() req
    ) {
        return this.jobsService.updateProcess(id, updateDto, req.user.id);
    }

    @Get('processes/:id/history')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive')
    @ApiOperation({ summary: 'Get process update history' })
    getProcessHistory(@Param('id') id: string) {
        return this.jobsService.getProcessHistory(id);
    }

    @Get('ready-for-dispatch')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive')
    @ApiOperation({ summary: 'Get all jobs ready for dispatch' })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    getReadyForDispatch(@Query('vendorId') vendorId?: string) {
        return this.jobsService.getReadyForDispatch(vendorId);
    }

    @Get('ready-for-dispatch/by-part')
    @Roles('admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc')
    @ApiOperation({ summary: 'Get dispatch-ready jobs grouped by part number' })
    @ApiQuery({ name: 'partNumber', required: false, type: String, description: 'Filter by specific part number' })
    @ApiQuery({ name: 'vendorId', required: false, type: String, description: 'Filter by vendor' })
    @ApiQuery({ name: 'customerId', required: false, type: String, description: 'Filter by customer' })
    getReadyForDispatchByPart(
        @Query('partNumber') partNumber?: string,
        @Query('vendorId') vendorId?: string,
        @Query('customerId') customerId?: string
    ) {
        return this.jobsService.getReadyForDispatchByPart(partNumber, vendorId, customerId);
    }
}
