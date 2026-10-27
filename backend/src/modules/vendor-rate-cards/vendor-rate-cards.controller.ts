import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { VendorRateCardsService } from './vendor-rate-cards.service';
import { CreateVendorRateCardDto, UpdateVendorRateCardDto } from './dto/create-rate-card.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Vendor Rate Cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vendors/:vendorId/rate-cards')
export class VendorRateCardsController {
    constructor(private readonly rateCardsService: VendorRateCardsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new rate card for a vendor' })
    create(@Param('vendorId') vendorId: string, @Body() dto: CreateVendorRateCardDto) {
        return this.rateCardsService.create(vendorId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all rate cards for a vendor' })
    findAll(@Param('vendorId') vendorId: string) {
        return this.rateCardsService.findAll(vendorId);
    }

    @Get('active')
    @ApiOperation({ summary: 'Get active rate card for an operation (for PO auto-pop)' })
    @ApiQuery({ name: 'operation', required: false })
    findActive(@Param('vendorId') vendorId: string, @Query('operation') operation?: string) {
        return this.rateCardsService.findActive(vendorId, operation);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a rate card' })
    update(@Param('id') id: string, @Body() dto: UpdateVendorRateCardDto) {
        return this.rateCardsService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a rate card' })
    remove(@Param('id') id: string) {
        return this.rateCardsService.remove(id);
    }
}
