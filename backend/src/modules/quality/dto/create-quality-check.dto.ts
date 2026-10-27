import { IsString, IsInt, IsOptional, IsArray, Min, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQualityCheckDto {
    @ApiProperty({ description: 'Quality check date', example: '2026-02-13' })
    @IsDateString()
    checkDate: string;

    @ApiPropertyOptional({ description: 'Reference to challan ID' })
    @IsOptional()
    @IsUUID()
    challanId?: string;

    @ApiPropertyOptional({ description: 'Reference to job process ID' })
    @IsOptional()
    @IsUUID()
    jobProcessId?: string;

    @ApiProperty({ description: 'Sample size for inspection', example: 50 })
    @IsInt()
    @Min(1)
    sampleSize: number;

    @ApiProperty({ description: 'Number of accepted/passed items', example: 45 })
    @IsInt()
    @Min(0)
    acceptedQty: number;

    @ApiProperty({ description: 'Number of rejected items', example: 3 })
    @IsInt()
    @Min(0)
    rejectedQty: number;

    @ApiProperty({ description: 'Number of items requiring rework', example: 2 })
    @IsInt()
    @Min(0)
    reworkQty: number;

    @ApiPropertyOptional({ description: 'Defect details as JSON array', example: [{ type: 'Dimensional', count: 3 }, { type: 'Surface Finish', count: 2 }] })
    @IsOptional()
    defects?: any;

    @ApiPropertyOptional({ description: 'Inspection remarks' })
    @IsOptional()
    @IsString()
    remarks?: string;

    @ApiPropertyOptional({ description: 'Photo URLs or file paths', type: [String] })
    @IsOptional()
    @IsArray()
    attachments?: string[];
}
