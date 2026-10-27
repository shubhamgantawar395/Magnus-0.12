import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobWorkType, POStatus } from '@prisma/client';

export class CreatePOItemDto {
    @ApiProperty({ example: 'PART-001' })
    @IsString()
    @IsNotEmpty()
    partNumber: string;

    @ApiPropertyOptional({ example: 'Steel Shaft' })
    @IsOptional()
    @IsString()
    partDescription?: string;

    @ApiPropertyOptional({ example: '7318' })
    @IsOptional()
    @IsString()
    hsnCode?: string;

    @ApiPropertyOptional({ example: 'DWG-101' })
    @IsOptional()
    @IsString()
    drawingNumber?: string;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiPropertyOptional({ example: 'NOS' })
    @IsOptional()
    @IsString()
    unitOfMeasure?: string;

    @ApiPropertyOptional({ example: ['Turning', 'Milling'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    operations?: string[];

    @ApiProperty({ example: 50.0 })
    @IsNumber()
    @Min(0)
    ratePerPiece: number;

    @ApiPropertyOptional({ example: 'SS304' })
    @IsOptional()
    @IsString()
    materialGrade?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    materialCost?: number;

    @ApiPropertyOptional({ example: '2024-03-01T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    deliverySchedule?: Date;
}

export class CreatePurchaseOrderDto {
    @ApiProperty({ example: 'PO/2026/02/001', description: 'Auto-generated if not provided' })
    @IsOptional()
    @IsString()
    poNumber?: string;

    @ApiProperty({ example: '2024-02-15T00:00:00Z' })
    @IsNotEmpty()
    @IsDateString()
    poDate: Date;

    @ApiProperty({ example: 'uuid-of-vendor' })
    @IsString()
    @IsNotEmpty()
    vendorId: string;

    @ApiPropertyOptional({ example: 'uuid-of-quotation' })
    @IsOptional()
    @IsString()
    quotationId?: string;

    @ApiProperty({ enum: JobWorkType, example: JobWorkType.with_material })
    @IsEnum(JobWorkType)
    jobWorkType: JobWorkType;

    @ApiPropertyOptional({ example: '2024-03-15T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    deliveryDate?: Date;

    @ApiPropertyOptional({ example: 'Factory Gate 1' })
    @IsOptional()
    @IsString()
    deliveryAddress?: string;

    @ApiPropertyOptional({ example: '30 days net' })
    @IsOptional()
    @IsString()
    paymentTerms?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    advancePayment?: number;

    @ApiPropertyOptional({ example: 'Standard terms apply.' })
    @IsOptional()
    @IsString()
    termsAndConditions?: string;

    @ApiPropertyOptional({ example: 'Urgent delivery required.' })
    @IsOptional()
    @IsString()
    remarks?: string;

    @ApiProperty({ type: [CreatePOItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePOItemDto)
    items: CreatePOItemDto[];
}
