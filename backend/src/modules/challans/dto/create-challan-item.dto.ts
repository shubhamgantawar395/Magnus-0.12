import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Length, IsNumber, IsArray, IsUUID } from 'class-validator';

export class CreateChallanItemDto {
    @ApiProperty({ example: 'PN-12345' })
    @IsString()
    @Length(2, 100)
    partNumber: string;

    @ApiProperty({ example: 'PO-ITEM-UUID', required: false, description: 'ID of the PO Item being dispatched' })
    @IsOptional()
    @IsUUID()
    poItemId?: string;

    @ApiProperty({ example: 'Bearing Housing - Stainless Steel', required: false })
    @IsOptional()
    @IsString()
    partDescription?: string;

    @ApiProperty({ example: '8401', required: false })
    @IsOptional()
    @IsString()
    @Length(1, 10)
    hsnCode?: string;

    @ApiProperty({ example: 'PN-12345-PROC', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    outputPartNumber?: string;

    @ApiProperty({ example: 'Finished Bearing Housing', required: false })
    @IsOptional()
    @IsString()
    outputDescription?: string;

    @ApiProperty({ example: 500 })
    @IsInt()
    @Min(1)
    quantityIssued: number;

    @ApiProperty({ example: 'NOS', required: false })
    @IsOptional()
    @IsString()
    @Length(1, 20)
    unitOfMeasure?: string;

    @ApiProperty({ example: 'SS304', required: false })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    materialGrade?: string;

    @ApiProperty({ example: 'DWG-001-REV-A', required: false })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    drawingReference?: string;

    @ApiProperty({ example: 107.10, required: false })
    @IsOptional()
    @IsNumber()
    unitPrice?: number;

    @ApiProperty({ example: 203490, required: false })
    @IsOptional()
    @IsNumber()
    totalAmount?: number;

    @ApiProperty({ example: ['Turning', 'Broaching'], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    operations?: string[];
}
