import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CustomerOrdersService } from './customer-orders.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Customer Orders')
@ApiBearerAuth()
@Controller('customer-orders')
@UseGuards(JwtAuthGuard)
export class CustomerOrdersController {
    constructor(private readonly service: CustomerOrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a customer order (Tier 1 PO received)' })
    create(@Body() dto: any, @Request() req) {
        return this.service.create(dto, req.user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all customer orders' })
    findAll(@Request() req, @Query('customerId') customerId?: string, @Query('status') status?: string) {
        return this.service.findAll(req.user.organizationId, { customerId, status });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer order details' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update customer order' })
    update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        return this.service.update(id, dto, req.user.organizationId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete customer order' })
    remove(@Param('id') id: string, @Request() req) {
        return this.service.remove(id, req.user.organizationId);
    }
}
