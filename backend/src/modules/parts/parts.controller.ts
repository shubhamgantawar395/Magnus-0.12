import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { CreatePartOperationDto, UpdatePartOperationDto, ReorderOperationsDto } from './dto/create-part-operation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

// Roles that can manage part master data
const PART_MANAGERS = [
    UserRole.admin, UserRole.director, UserRole.gm, UserRole.executive,
    UserRole.plant_head, UserRole.production_manager, UserRole.ppc_manager,
];

// Roles that can modify job cycle (PPC is intentionally excluded)
const JOB_CYCLE_MANAGERS = [
    UserRole.admin, UserRole.director, UserRole.gm,
    UserRole.plant_head, UserRole.production_manager,
];

@Controller('parts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Parts')
@ApiBearerAuth()
export class PartsController {
    constructor(private readonly partsService: PartsService) { }

    // ── End Customers ────────────────────────────────────────────────────────

    @Get('customers')
    @Roles(...Object.values(UserRole))
    @ApiOperation({ summary: 'List all Tier 1 customers for dropdown / management' })
    getEndCustomers(@CurrentUser() user: any) {
        return this.partsService.getEndCustomers(user.organizationId);
    }

    // ── Parts ────────────────────────────────────────────────────────────────

    @Post()
    @Roles(...PART_MANAGERS)
    @ApiOperation({ summary: 'Create a new part' })
    create(@Body() dto: CreatePartDto, @CurrentUser() user: any) {
        return this.partsService.create(dto, user.organizationId);
    }

    @Get()
    @Roles(...Object.values(UserRole))
    @ApiOperation({ summary: 'List all parts, optionally filtered by customer' })
    findAll(
        @CurrentUser() user: any,
        @Query('endCustomerId') endCustomerId?: string,
        @Query('search') search?: string,
    ) {
        return this.partsService.findAll(user.organizationId, endCustomerId, search);
    }

    @Get(':id')
    @Roles(...Object.values(UserRole))
    @ApiOperation({ summary: 'Get part details with full job cycle' })
    findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.partsService.findOne(id, user.organizationId);
    }

    @Patch(':id')
    @Roles(...PART_MANAGERS)
    @ApiOperation({ summary: 'Update part master data' })
    update(@Param('id') id: string, @Body() dto: Partial<CreatePartDto>, @CurrentUser() user: any) {
        return this.partsService.update(id, dto, user.organizationId);
    }

    @Patch('by-number/:partNumber/dispatch-target')
    @Roles(...PART_MANAGERS)
    @ApiOperation({ summary: 'Update dispatch target for a part (by part number)' })
    updateDispatchTarget(
        @Param('partNumber') partNumber: string,
        @Body() dto: { dispatchTarget: number },
        @CurrentUser() user: any,
    ) {
        return this.partsService.updateDispatchTargetByNumber(partNumber, dto.dispatchTarget, user.organizationId);
    }

    // ── Job Cycle (Operations) ────────────────────────────────────────────────
    // PPC can GET but NOT POST/PATCH/DELETE — enforced both here via @Roles
    // AND in the service via assertCanEditJobCycle() as a second safety layer.

    @Get(':id/operations')
    @Roles(...Object.values(UserRole))
    @ApiOperation({ summary: 'Get job cycle for a part (all eligible roles)' })
    getOperations(@Param('id') id: string, @CurrentUser() user: any) {
        return this.partsService.getOperations(id, user.organizationId);
    }

    @Post(':id/operations')
    @Roles(...JOB_CYCLE_MANAGERS)
    @ApiOperation({ summary: 'Add an operation to the job cycle (Production/Leadership only)' })
    addOperation(
        @Param('id') partId: string,
        @Body() dto: CreatePartOperationDto,
        @CurrentUser() user: any,
    ) {
        return this.partsService.addOperation(partId, dto, user.id, user.role as UserRole, user.organizationId);
    }

    @Patch(':id/operations/reorder')
    @Roles(...JOB_CYCLE_MANAGERS)
    @ApiOperation({ summary: 'Reorder operations in the job cycle' })
    reorderOperations(
        @Param('id') partId: string,
        @Body() dto: ReorderOperationsDto,
        @CurrentUser() user: any,
    ) {
        return this.partsService.reorderOperations(partId, dto.operations, user.role as UserRole, user.organizationId);
    }

    @Patch(':id/operations/:opId')
    @Roles(...JOB_CYCLE_MANAGERS)
    @ApiOperation({ summary: 'Update an operation (Production/Leadership only)' })
    updateOperation(
        @Param('id') partId: string,
        @Param('opId') opId: string,
        @Body() dto: UpdatePartOperationDto,
        @CurrentUser() user: any,
    ) {
        return this.partsService.updateOperation(partId, opId, dto, user.role as UserRole, user.organizationId);
    }

    @Delete(':id/operations/:opId')
    @Roles(...JOB_CYCLE_MANAGERS)
    @ApiOperation({ summary: 'Remove an operation from the job cycle (soft delete)' })
    deleteOperation(
        @Param('id') partId: string,
        @Param('opId') opId: string,
        @CurrentUser() user: any,
    ) {
        return this.partsService.deleteOperation(partId, opId, user.role as UserRole, user.organizationId);
    }
}
