import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new supplier' })
    create(@Body() dto: CreateSupplierDto, @Request() req) {
        return this.suppliersService.create(dto, req.user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all suppliers' })
    findAll(
        @Request() req,
        @Query('search') search?: string,
        @Query('materialType') materialType?: string,
    ) {
        return this.suppliersService.findAll(req.user.organizationId, search, materialType);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get supplier details with linked parts' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.suppliersService.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update supplier' })
    update(@Param('id') id: string, @Body() dto: UpdateSupplierDto, @Request() req) {
        return this.suppliersService.update(id, dto, req.user.organizationId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete supplier (unlinks parts first)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.suppliersService.remove(id, req.user.organizationId);
    }
}
