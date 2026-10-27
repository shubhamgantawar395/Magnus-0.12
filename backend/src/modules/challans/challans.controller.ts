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
    Request,
    Res
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChallansService } from './challans.service';
import { PdfService } from '../common/pdf.service';
import { CreateChallanDto } from './dto/create-challan.dto';
import { UpdateChallanDto } from './dto/update-challan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChallanStatus } from '@prisma/client';

@ApiTags('challans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('challans')
export class ChallansController {
    constructor(
        private readonly challansService: ChallansService,
        private readonly pdfService: PdfService
    ) { }

    @Post()
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager', 'production_manager')
    @ApiOperation({ summary: 'Create a new delivery challan with items' })
    create(@Body() createChallanDto: CreateChallanDto, @Request() req) {
        return this.challansService.create(createChallanDto, req.user.id);
    }

    @Get()
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'director', 'gm', 'ppc_manager', 'production_manager', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'executive')
    @ApiOperation({ summary: 'Get all delivery challans' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'customerId', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ChallanStatus })
    @ApiQuery({ name: 'search', required: false, type: String })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('customerId') customerId?: string,
        @Query('vendorId') vendorId?: string,
        @Query('status') status?: ChallanStatus,
        @Query('search') search?: string
    ) {
        return this.challansService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            customerId,
            vendorId,
            status,
            search
        );
    }

    @Get(':id')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'director', 'gm', 'ppc_manager', 'production_manager', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'executive', 'quality_head', 'quality_supervisor', 'plant_head', 'store_keeper', 'accounts_manager', 'security')
    @ApiOperation({ summary: 'Get challan by ID with items' })
    findOne(@Param('id') id: string) {
        return this.challansService.findOne(id);
    }

    @Patch(':id')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager', 'production_manager')
    @ApiOperation({ summary: 'Update challan' })
    update(@Param('id') id: string, @Body() updateChallanDto: UpdateChallanDto) {
        return this.challansService.update(id, updateChallanDto);
    }

    @Patch(':id/status')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'ppc_manager', 'production_manager', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'store_keeper')
    @ApiOperation({ summary: 'Update challan status' })
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: ChallanStatus
    ) {
        return this.challansService.updateStatus(id, status);
    }

    @Get(':id/pdf')
    @Roles('admin', 'platform_admin', 'customer', 'vendor', 'director', 'gm', 'ppc_manager', 'production_manager', 'vendor_owner', 'vendor_user', 'vendor_ppc', 'vendor_supervisor', 'executive', 'quality_head', 'quality_supervisor', 'plant_head', 'store_keeper', 'accounts_manager', 'security')
    @ApiOperation({ summary: 'Generate PDF for challan' })
    async generatePdf(@Param('id') id: string, @Res() res: Response) {
        const challan = await this.challansService.findOne(id);
        const pdfBuffer = await this.pdfService.generateChallanPdf(challan);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${challan.challanNumber || id}.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    }

    @Delete(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete challan' })
    remove(@Param('id') id: string) {
        return this.challansService.remove(id);
    }
}
