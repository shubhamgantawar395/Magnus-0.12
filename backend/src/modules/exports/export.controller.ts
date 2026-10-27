import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    BadRequestException,
    Res
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ReportsService } from '../reports/reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exports')
export class ExportController {
    constructor(
        private readonly exportService: ExportService,
        private readonly reportsService: ReportsService
    ) { }

    @Get('stock-statement')
    @Roles('admin', 'customer', 'vendor')
    @ApiOperation({ summary: 'Export stock statement to Excel or CSV' })
    @ApiQuery({ name: 'vendorId', required: false, type: String })
    @ApiQuery({ name: 'month', required: true, type: Number })
    @ApiQuery({ name: 'year', required: true, type: Number })
    @ApiQuery({ name: 'format', required: false, enum: ['excel', 'csv'], description: 'Export format (default: excel)' })
    async exportStockStatement(
        @Query('vendorId') vendorId: string,
        @Query('month') month: string,
        @Query('year') year: string,
        @Query('format') format: string = 'excel',
        @Request() req,
        @Res() res: Response
    ) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);

        if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) {
            throw new BadRequestException('Invalid month or year');
        }

        // If vendor role, use their own vendorId
        const targetVendorId = req.user.role === 'vendor' ? req.user.vendorId : vendorId;

        if (!targetVendorId) {
            throw new BadRequestException('Vendor ID is required');
        }

        // Get stock statement data
        const data = await this.reportsService.getStockStatement(targetVendorId, monthNum, yearNum);

        if (format === 'csv') {
            const csv = this.exportService.exportStockStatementToCSV(data);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=stock-statement-${monthNum}-${yearNum}.csv`);
            res.send(csv);
        } else {
            const buffer = await this.exportService.exportStockStatementToExcel(data);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=stock-statement-${monthNum}-${yearNum}.xlsx`);
            res.send(buffer);
        }
    }
}
