import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ExecutionType } from '@prisma/client';

export class CreatePartOperationDto {
    @ApiProperty({ example: 10, description: 'Operation sequence (10, 20, 30…)' })
    @IsInt()
    @Min(1)
    sequenceNumber: number;

    @ApiProperty({ example: 'OP-10', required: false })
    @IsOptional()
    @IsString()
    operationCode?: string;

    @ApiProperty({ example: 'CNC Turning' })
    @IsString()
    operationName: string;

    @ApiProperty({ enum: ExecutionType, example: 'inhouse' })
    @IsEnum(ExecutionType)
    executionType: ExecutionType;

    @ApiProperty({ example: 'CNC Lathe', required: false, description: 'For inhouse ops' })
    @IsOptional()
    @IsString()
    machineType?: string;

    @ApiProperty({ example: 'Surface Grinding', required: false, description: 'Capability type needed from outsourced vendor' })
    @IsOptional()
    @IsString()
    vendorCapability?: string;

    @ApiProperty({ example: 4.5, required: false, description: 'Standard cycle time in minutes per piece' })
    @IsOptional()
    @IsNumber()
    standardCycleTime?: number;

    @ApiProperty({ example: 'Critical — 0.02mm tolerance', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdatePartOperationDto {
    @ApiProperty({ example: 'CNC Turning', required: false })
    @IsOptional()
    @IsString()
    operationName?: string;

    @ApiProperty({ example: 'OP-10', required: false })
    @IsOptional()
    @IsString()
    operationCode?: string;

    @ApiProperty({ enum: ExecutionType, required: false })
    @IsOptional()
    @IsEnum(ExecutionType)
    executionType?: ExecutionType;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    machineType?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    vendorCapability?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    standardCycleTime?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ReorderOperationsDto {
    @ApiProperty({ description: 'Array of { id, sequenceNumber } to reorder' })
    operations: { id: string; sequenceNumber: number }[];
}
