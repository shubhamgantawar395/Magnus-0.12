import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VendorInvoiceService, CreateVendorInvoiceDto, UpdateVendorInvoiceDto } from './vendor-invoice.service';
import { PdfService } from '../common/pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { InvoiceStatus } from '@prisma/client';

@ApiTags('vendor-invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vendor-invoices')
export class VendorInvoiceController {
    constructor(
        private readonly vendorInvoiceService: VendorInvoiceService,
        private readonly pdfService: PdfService
    ) { }

    @Get('available-challans')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'platform_admin')
    @ApiOperation({ summary: 'Get challans available for invoicing' })
    async getAvailableChallans(@Request() req) {
        const vendorId = req.user.vendorId;
        if (!vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }
        return this.vendorInvoiceService.getAvailableChallans(vendorId);
    }

    @Get('challan/:id')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'platform_admin')
    @ApiOperation({ summary: 'Get challan details with available quantities' })
    async getChallanDetails(@Param('id') id: string, @Request() req) {
        const vendorId = req.user.vendorId;
        if (!vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }
        return this.vendorInvoiceService.getChallanDetails(id, vendorId);
    }

    @Get(':id/pdf')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'admin', 'platform_admin', 'customer')
    @ApiOperation({ summary: 'Generate PDF for invoice' })
    async generatePdf(@Param('id') id: string, @Request() req) {
        const vendorRoles = ['vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor'];
        const vendorId = vendorRoles.includes(req.user.role) ? req.user.vendorId : undefined;
        const invoice = await this.vendorInvoiceService.getInvoiceById(id, vendorId || undefined);
        const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice);

        req.res.setHeader('Content-Type', 'application/pdf');
        req.res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);

        return pdfBuffer;
    }

    @Post()
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'platform_admin')
    @ApiOperation({ summary: 'Create vendor invoice' })
    async createInvoice(@Body() data: CreateVendorInvoiceDto, @Request() req) {
        const vendorId = req.user.vendorId;
        if (!vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }
        return this.vendorInvoiceService.createInvoice(vendorId, data);
    }

    @Get()
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'admin', 'platform_admin', 'executive', 'director', 'gm', 'ppc_manager', 'security', 'customer')
    @ApiOperation({ summary: 'Get vendor invoices' })
    @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
    @ApiQuery({ name: 'customerId', required: false, type: String })
    @ApiQuery({ name: 'startDate', required: false, type: String })
    @ApiQuery({ name: 'endDate', required: false, type: String })
    async getInvoices(
        @Query('status') status: InvoiceStatus,
        @Query('customerId') customerId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Request() req
    ) {
        const vendorRoles = ['vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor'];
        const vendorId = vendorRoles.includes(req.user.role) ? req.user.vendorId : undefined;
        if (vendorRoles.includes(req.user.role) && !vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }

        const filters: any = {};
        if (status) filters.status = status;
        if (customerId) filters.customerId = customerId;
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) filters.endDate = new Date(endDate);

        return this.vendorInvoiceService.getInvoices(vendorId, filters);
    }

    @Get(':id')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'admin', 'platform_admin', 'executive', 'director', 'gm', 'ppc_manager', 'security', 'customer')
    @ApiOperation({ summary: 'Get invoice by ID' })
    async getInvoiceById(@Param('id') id: string, @Request() req) {
        const vendorRoles = ['vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor'];
        const vendorId = vendorRoles.includes(req.user.role) ? req.user.vendorId : undefined;
        return this.vendorInvoiceService.getInvoiceById(id, vendorId);
    }

    @Put(':id')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'platform_admin')
    @ApiOperation({ summary: 'Update draft or submitted invoice (locked after gate approval)' })
    async updateInvoice(
        @Param('id') id: string,
        @Body() data: UpdateVendorInvoiceDto,
        @Request() req
    ) {
        const vendorId = req.user.vendorId;
        if (!vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }
        return this.vendorInvoiceService.updateInvoice(id, vendorId, data);
    }

    @Post(':id/submit')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'platform_admin')
    @ApiOperation({ summary: 'Submit invoice for approval' })
    async submitInvoice(@Param('id') id: string, @Request() req) {
        const vendorId = req.user.vendorId;
        if (!vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }
        return this.vendorInvoiceService.submitInvoice(id, vendorId);
    }

    @Delete(':id')
    @Roles('vendor', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'platform_admin')
    @ApiOperation({ summary: 'Delete draft invoice' })
    async deleteInvoice(@Param('id') id: string, @Request() req) {
        const vendorId = req.user.vendorId;
        if (!vendorId) {
            throw new BadRequestException('Vendor ID not found');
        }
        return this.vendorInvoiceService.deleteInvoice(id, vendorId);
    }

    @Post(':id/gate-approve')
    @Roles('security', 'admin', 'director', 'gm', 'platform_admin')
    @ApiOperation({ summary: 'Gate-approve invoice (security verifies physical delivery)' })
    async gateApproveInvoice(
        @Param('id') id: string,
        @Body() body: { items: { itemId: string; gateReceivedQty: number; gateRemarks?: string }[]; gateRemarks?: string },
        @Request() req,
    ) {
        return this.vendorInvoiceService.gateApproveInvoice(id, req.user.id, body.items, body.gateRemarks);
    }

    @Post(':id/approve')
    @Roles('admin', 'executive', 'director', 'gm', 'ppc_manager', 'platform_admin')
    @ApiOperation({ summary: 'Approve gate-approved vendor invoice (PPC)' })
    async approveInvoice(@Param('id') id: string, @Request() req) {
        return this.vendorInvoiceService.approveInvoice(id, req.user.id);
    }
}
