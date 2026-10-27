import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { MachinesService } from './machines.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMachineDto {
    @IsString() machineCode: string;
    @IsString() machineName: string;
    @IsString() machineType: string;
    @IsOptional() @IsString() department?: string;
}

export class UpdateMachineDto {
    @IsOptional() @IsString() machineName?: string;
    @IsOptional() @IsString() machineType?: string;
    @IsOptional() @IsString() department?: string;
    @IsOptional() @IsBoolean() isActive?: boolean;
}

@ApiTags('Machines')
@ApiBearerAuth()
@Controller('machines')
@UseGuards(JwtAuthGuard)
export class MachinesController {
    constructor(private readonly machinesService: MachinesService) { }

    @Post()
    @ApiOperation({ summary: 'Register a new machine' })
    create(@Body() dto: CreateMachineDto, @Request() req) {
        return this.machinesService.create(dto, req.user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'List all machines' })
    findAll(@Request() req, @Query('isActive') isActive?: string, @Query('department') department?: string) {
        const active = isActive !== undefined ? isActive === 'true' : undefined;
        return this.machinesService.findAll(req.user.organizationId, { isActive: active, department });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get machine details' })
    findOne(@Param('id') id: string, @Request() req) {
        return this.machinesService.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update machine' })
    update(@Param('id') id: string, @Body() dto: UpdateMachineDto, @Request() req) {
        return this.machinesService.update(id, dto, req.user.organizationId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete machine' })
    remove(@Param('id') id: string, @Request() req) {
        return this.machinesService.remove(id, req.user.organizationId);
    }
}
