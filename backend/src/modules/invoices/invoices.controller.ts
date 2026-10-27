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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceStatus } from '@prisma/client';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
    constructor(private readonly invoicesService: InvoicesService) { }

    @Post()
    @Roles('admin', 'platform_admin', 'vendor_owner', 'vendor_user', 'vendor_ppc') // Expanded roles for vendor invoicing
    @ApiOperation({ summary: 'Create a new invoice' })
    create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req) {
        return this.invoicesService.create(createInvoiceDto, req.user.id); // Also using req.user.id to be safe
    }

    @Get()
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive', 'accounts_manager')
    @ApiOperation({ summary: 'Get all invoices' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: InvoiceStatus
    ) {
        return this.invoicesService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            vendorId,
            status
        );
    }

    @Get(':id')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'director', 'gm', 'ppc_manager', 'production_manager', 'executive', 'accounts_manager')
    @ApiOperation({ summary: 'Get invoice by ID' })
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'vendor')
    @ApiOperation({ summary: 'Update invoice' })
    update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
        return this.invoicesService.update(id, updateInvoiceDto);
    }

    @Post(':id/finalize')
    @Roles('admin', 'vendor')
    @ApiOperation({ summary: 'Finalize invoice (change from draft to sent)' })
    finalize(@Param('id') id: string) {
        return this.invoicesService.finalize(id);
    }

    @Patch(':id/status')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager')
    @ApiOperation({ summary: 'Update invoice status (Approve/Reject)' })
    updateStatus(@Param('id') id: string, @Body('status') status: InvoiceStatus) {
        return this.invoicesService.updateStatus(id, status);
    }

    @Delete(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete invoice' })
    remove(@Param('id') id: string) {
        return this.invoicesService.remove(id);
    }
}
