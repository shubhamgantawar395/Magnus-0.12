import {
    Controller, Get, Post, Body, Param,
    UseGuards, Request, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SupplierGRNService, CreateSupplierGRNDto } from './supplier-grn.service';

// All internal org users who work with procurement / store / PPC
const STORE_ROLES = [
    UserRole.admin, UserRole.director, UserRole.gm, UserRole.executive,
    UserRole.plant_head, UserRole.production_manager, UserRole.ppc_manager,
    UserRole.store_keeper, UserRole.accounts_manager,
];

@ApiTags('Supplier GRN')
@ApiBearerAuth()
@Controller('supplier-grn')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupplierGRNController {
    constructor(private readonly service: SupplierGRNService) {}

    @Post()
    @Roles(...STORE_ROLES)
    @ApiOperation({ summary: 'Record a new Supplier GRN (casting/forging inward)' })
    create(@Body() dto: CreateSupplierGRNDto, @Request() req) {
        return this.service.create(dto, req.user.id, req.user.organizationId);
    }

    @Get()
    @Roles(...STORE_ROLES)
    @ApiOperation({ summary: 'List all Supplier GRNs' })
    @ApiQuery({ name: 'supplierId', required: false })
    @ApiQuery({ name: 'poId', required: false })
    @ApiQuery({ name: 'dateFrom', required: false })
    @ApiQuery({ name: 'dateTo', required: false })
    @ApiQuery({ name: 'search', required: false })
    findAll(
        @Request() req,
        @Query('supplierId') supplierId?: string,
        @Query('poId') poId?: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
        @Query('search') search?: string,
    ) {
        return this.service.findAll(req.user.organizationId, {
            supplierId,
            poId,
            dateFrom: dateFrom ? new Date(dateFrom) : undefined,
            dateTo: dateTo ? new Date(dateTo) : undefined,
            search,
        });
    }

    @Get('store-balance')
    @Roles(...STORE_ROLES)
    @ApiOperation({ summary: 'Live store balance per part (GRN inward − challan dispatched)' })
    @ApiQuery({ name: 'partNumber', required: false })
    storeBalance(@Request() req, @Query('partNumber') partNumber?: string) {
        return this.service.getStoreBalance(req.user.organizationId, partNumber);
    }

    @Get(':id')
    @Roles(...STORE_ROLES)
    @ApiOperation({ summary: 'Get GRN details' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organizationId);
    }
}
