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
import { DispatchService } from './dispatch.service';
import { CreateDispatchPlanDto } from './dto/create-dispatch-plan.dto';
import { UpdateDispatchPlanDto } from './dto/update-dispatch-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DispatchStatus } from '@prisma/client';

@ApiTags('dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dispatch')
export class DispatchController {
    constructor(private readonly dispatchService: DispatchService) { }

    @Post('plans')
    @Roles('admin', 'customer', 'ppc_manager', 'director', 'gm', 'executive', 'production_manager')
    @ApiOperation({ summary: 'Create dispatch plan' })
    create(@Body() createDispatchPlanDto: CreateDispatchPlanDto, @Request() req) {
        return this.dispatchService.create(createDispatchPlanDto, req.user.id);
    }

    @Get('plans')
    @Roles('admin', 'customer', 'vendor', 'ppc_manager', 'director', 'gm', 'executive', 'production_manager', 'vendor_owner', 'vendor_user', 'vendor_ppc')
    @ApiOperation({ summary: 'Get all dispatch plans' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: DispatchStatus })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: DispatchStatus
    ) {
        return this.dispatchService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            vendorId,
            status
        );
    }

    @Get('plans/:id')
    @Roles('admin', 'customer', 'vendor', 'ppc_manager', 'director', 'gm', 'executive', 'production_manager', 'vendor_owner', 'vendor_user', 'vendor_ppc')
    @ApiOperation({ summary: 'Get dispatch plan by ID' })
    findOne(@Param('id') id: string) {
        return this.dispatchService.findOne(id);
    }

    @Patch('plans/:id')
    @Roles('admin', 'customer', 'ppc_manager', 'director', 'gm', 'executive', 'production_manager')
    @ApiOperation({ summary: 'Update dispatch plan' })
    update(@Param('id') id: string, @Body() updateDispatchPlanDto: UpdateDispatchPlanDto) {
        return this.dispatchService.update(id, updateDispatchPlanDto);
    }

    @Post('plans/:id/confirm')
    @Roles('admin', 'customer', 'ppc_manager', 'director', 'gm', 'executive', 'production_manager')
    @ApiOperation({ summary: 'Confirm dispatch (mark as in-transit)' })
    confirm(@Param('id') id: string) {
        return this.dispatchService.confirm(id);
    }

    @Delete('plans/:id')
    @Roles('admin', 'ppc_manager', 'director')
    @ApiOperation({ summary: 'Delete dispatch plan' })
    remove(@Param('id') id: string) {
        return this.dispatchService.remove(id);
    }
}
