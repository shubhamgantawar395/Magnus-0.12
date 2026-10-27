import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString, IsArray, ValidateNested, ArrayMinSize, IsInt, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';

class DispatchItemDto {
    @ApiProperty({ example: 'challan-item-uuid' })
    @IsUUID()
    challanItemId: string;

    @ApiProperty({ example: 450 })
    @IsInt()
    @Min(1)
    quantityDispatched: number;

    @ApiProperty({ example: 9, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    traysUsed?: number;
}

export class CreateDispatchPlanDto {
    @ApiProperty({ example: 'customer-uuid' })
    @IsUUID()
    customerId: string;

    @ApiProperty({ example: 'vendor-uuid' })
    @IsUUID()
    vendorId: string;

    @ApiProperty({ example: '2026-02-10' })
    @IsDateString()
    plannedDate: string;

    @ApiProperty({ example: 'MH12AB5678', required: false })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    vehicleNumber?: string;

    @ApiProperty({ example: 'Suresh Patil', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    driverName?: string;

    @ApiProperty({ example: '+91-9876543210', required: false })
    @IsOptional()
    @IsString()
    @Length(10, 20)
    driverPhone?: string;

    @ApiProperty({ example: 5, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalTrays?: number;

    @ApiProperty({ example: 'Pickup from vendor at 10 AM', required: false })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({ type: [DispatchItemDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => DispatchItemDto)
    items: DispatchItemDto[];
}
