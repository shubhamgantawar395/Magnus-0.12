import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { PartDevelopmentsService } from './part-developments.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreatePartDevelopmentDto {
    @IsString() partId: string;
    @IsString() vendorId: string;
    @IsOptional() @IsString() stage?: string;
    @IsOptional() @IsString() drawingVersion?: string;
    @IsOptional() @IsString() drawingUrl?: string;
    @IsOptional() @IsDateString() targetDate?: string;
    @IsOptional() @IsString() remarks?: string;
}

@ApiTags('Part Developments')
@ApiBearerAuth()
@Controller('part-developments')
@UseGuards(JwtAuthGuard)
export class PartDevelopmentsController {
    constructor(private readonly service: PartDevelopmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a part development record' })
    create(@Body() dto: CreatePartDevelopmentDto, @Request() req) {
        return this.service.create(dto, req.user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all part developments' })
    findAll(@Request() req, @Query('vendorId') vendorId?: string, @Query('partId') partId?: string, @Query('stage') stage?: string) {
        return this.service.findAll(req.user.organizationId, { vendorId, partId, stage });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get part development detail' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.service.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update part development' })
    update(@Param('id') id: string, @Body() dto: any, @Request() req) {
        return this.service.update(id, dto, req.user.organizationId);
    }

    @Post(':id/approve')
    @ApiOperation({ summary: 'Approve part development' })
    approve(@Param('id') id: string, @Body('remarks') remarks: string, @Request() req) {
        return this.service.approve(id, req.user.id, req.user.organizationId, remarks);
    }

    @Post(':id/reject')
    @ApiOperation({ summary: 'Reject part development' })
    reject(@Param('id') id: string, @Body('rejectionReason') rejectionReason: string, @Request() req) {
        return this.service.reject(id, req.user.organizationId, rejectionReason);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete part development' })
    remove(@Param('id') id: string, @Request() req) {
        return this.service.remove(id, req.user.organizationId);
    }
}
