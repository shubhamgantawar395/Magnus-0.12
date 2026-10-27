import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { VendorLedgerService } from './vendor-ledger.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vendor Material Ledger')
@ApiBearerAuth()
@Controller('vendor-ledger')
@UseGuards(JwtAuthGuard)
export class VendorLedgerController {
    constructor(private readonly service: VendorLedgerService) { }

    @Get()
    @ApiOperation({ summary: 'Get ledger entries for a vendor' })
    findAll(@Request() req, @Query('vendorId') vendorId: string, @Query('partNumber') partNumber?: string) {
        return this.service.findAll(req.user.organizationId, { vendorId, partNumber });
    }

    @Get('balance')
    @ApiOperation({ summary: 'Get current material balance per vendor/part' })
    getBalance(@Request() req, @Query('vendorId') vendorId?: string, @Query('partNumber') partNumber?: string) {
        return this.service.getBalance(req.user.organizationId, { vendorId, partNumber });
    }

    @Post('adjustment')
    @ApiOperation({ summary: 'Post a manual adjustment entry' })
    adjust(@Body() dto: { vendorId: string; partNumber: string; quantity: number; remarks: string }, @Request() req) {
        return this.service.addAdjustment(dto, req.user.organizationId);
    }
}
