import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { ApprovalPurchaseOrderDto, RejectPurchaseOrderDto } from './dto/approval-po.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { POStatus, UserRole } from '@prisma/client';
import { PdfService } from '../common/pdf.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
    constructor(
        private readonly purchaseOrdersService: PurchaseOrdersService,
        private readonly pdfService: PdfService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new Purchase Order' })
    create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto, @Request() req) {
        return this.purchaseOrdersService.create(createPurchaseOrderDto, req.user.id, req.user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all Purchase Orders' })
    findAll(@Request() req, @Query('status') status?: POStatus, @Query('vendorId') vendorId?: string) {
        return this.purchaseOrdersService.findAll(req.user.organizationId, { status, vendorId });
    }

    @Get(':id/pdf')
    @ApiOperation({ summary: 'Download PO as PDF' })
    async downloadPdf(@Param('id') id: string, @Request() req, @Res() res: Response) {
        const po = await this.purchaseOrdersService.findOne(id, req.user.organizationId);
        const pdfBuffer = await this.pdfService.generatePurchaseOrderPdf(po);
        const filename = `PO-${po.poNumber?.replace(/\//g, '-') || id}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length,
        });
        res.end(pdfBuffer);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get PO details' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.purchaseOrdersService.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update PO' })
    update(@Param('id') id: string, @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto, @Request() req) {
        return this.purchaseOrdersService.update(id, updatePurchaseOrderDto, req.user.organizationId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete PO (Draft only)' })
    remove(@Param('id') id: string, @Request() req) {
        return this.purchaseOrdersService.remove(id, req.user.organizationId);
    }

    @Post(':id/submit')
    @ApiOperation({ summary: 'Submit PO for approval' })
    submit(@Param('id') id: string, @Request() req) {
        return this.purchaseOrdersService.submit(id, req.user.organizationId);
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve PO (Admin/Director/GM)' })
    @UseGuards(RolesGuard)
    @Roles(UserRole.admin, UserRole.director, UserRole.gm, UserRole.platform_admin)
    approve(@Param('id') id: string, @Body() dto: ApprovalPurchaseOrderDto, @Request() req) {
        return this.purchaseOrdersService.approve(id, req.user.id, req.user.organizationId, dto.remarks);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject PO (Admin/Director/GM)' })
    @UseGuards(RolesGuard)
    @Roles(UserRole.admin, UserRole.director, UserRole.gm, UserRole.platform_admin)
    reject(@Param('id') id: string, @Body() dto: RejectPurchaseOrderDto, @Request() req) {
        return this.purchaseOrdersService.reject(id, req.user.id, req.user.organizationId, dto.rejectionReason);
    }
}
