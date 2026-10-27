import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString, IsArray, ValidateNested, ArrayMinSize, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateChallanItemDto } from './create-challan-item.dto';

export class CreateChallanDto {
    @ApiProperty({ example: 'customer-uuid' })
    @IsUUID()
    customerId: string;

    @ApiProperty({ example: 'vendor-uuid' })
    @IsUUID()
    vendorId: string;

    @ApiProperty({ example: '2026-02-05', description: 'Challan date in YYYY-MM-DD format' })
    @IsDateString()
    challanDate: string;

    @ApiProperty({ example: 'Original', required: false, description: 'Original, Duplicate, Triplicate, Quadruplicate' })
    @IsOptional()
    @IsString()
    copyType?: string;

    @ApiProperty({ example: 'PO-UUID', required: false, description: 'ID of the Purchase Order' })
    @IsOptional()
    @IsUUID()
    poId?: string;

    @ApiProperty({ example: 'PO-2024-001', required: false })
    @IsOptional()
    @IsString()
    poNumber?: string;

    @ApiProperty({ example: 'Maharashtra', required: false })
    @IsOptional()
    @IsString()
    placeOfSupply?: string;

    @ApiProperty({ example: 'MH12AB1234', required: false })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    vehicleNumber?: string;

    @ApiProperty({ example: 'Ramesh Kumar', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    driverName?: string;

    @ApiProperty({ example: '+91-9876543210', required: false })
    @IsOptional()
    @IsString()
    @Length(10, 20)
    driverPhone?: string;

    @ApiProperty({ example: 'VRL Logistics', required: false })
    @IsOptional()
    @IsString()
    transporterName?: string;

    @ApiProperty({ example: 'Road', required: false })
    @IsOptional()
    @IsString()
    transportMode?: string;

    @ApiProperty({ example: '121234345656', required: false })
    @IsOptional()
    @IsString()
    ewayBillNumber?: string;

    @ApiProperty({ example: '2026-02-05', required: false })
    @IsOptional()
    @IsDateString()
    ewayBillDate?: string;

    @ApiProperty({ example: '2026-02-06', required: false })
    @IsOptional()
    @IsDateString()
    ewayBillExpiry?: string;

    @ApiProperty({ example: 'Urgent delivery required', required: false })
    @IsOptional()
    @IsString()
    remarks?: string;

    @ApiProperty({ example: '{"name": "Plant 1", "address": "Ind. Area"}', required: false })
    @IsOptional()
    issuerDetails?: any;

    @ApiProperty({ type: [CreateChallanItemDto], description: 'List of items in the challan' })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateChallanItemDto)
    items: CreateChallanItemDto[];
}
