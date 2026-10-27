import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { StockStatementsService } from './stock-statements.service';
import { CreateStockStatementDto } from './dto/create-stock-statement.dto';
import { UpdateStockStatementDto } from './dto/update-stock-statement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Stock Statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-statements')
export class StockStatementsController {
    constructor(private readonly stockService: StockStatementsService) { }

    @Post()
    @ApiOperation({ summary: 'Generate a new Stock Statement (Draft)' })
    create(@Body() createDto: CreateStockStatementDto, @CurrentUser() user: any) {
        return this.stockService.create(createDto, user.id, user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'List Stock Statements' })
    findAll(@CurrentUser() user: any, @Query('vendorId') vendorId?: string) {
        const filters: any = {};
        if (vendorId) filters.vendorId = vendorId;
        return this.stockService.findAll(user.organizationId, filters);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get Stock Statement Details' })
    findOne(@Param('id') id: string, @CurrentUser() user: any) {
        return this.stockService.findOne(id, user.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update Stock Statement (Verify/Submit)' })
    update(@Param('id') id: string, @Body() updateDto: UpdateStockStatementDto, @CurrentUser() user: any) {
        return this.stockService.update(id, updateDto, user.organizationId);
    }
}
