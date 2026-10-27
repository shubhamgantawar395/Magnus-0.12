import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDispatchDeadlineDto {
    @ApiProperty({ example: 'uuid-customer-id', description: 'Customer ID' })
    @IsNotEmpty()
    @IsString()
    customerId: string;

    @ApiProperty({ example: 'uuid-vendor-id', description: 'Vendor ID' })
    @IsNotEmpty()
    @IsString()
    vendorId: string;

    @ApiProperty({ example: '2024-03-31', description: 'Planned Dispatch Date' })
    @IsNotEmpty()
    @IsDateString()
    plannedDate: string;

    @ApiProperty({ example: 'Urgent requirement for Q1', description: 'Notes or Remarks', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
