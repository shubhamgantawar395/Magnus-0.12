import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsDateString, IsArray, ValidateNested, ArrayMinSize, IsNumber, IsEnum, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType } from '@prisma/client';

class InvoiceItemDto {
    @ApiProperty({ example: 'challan-uuid', required: false })
    @IsOptional()
    @IsUUID()
    challanId?: string;

    @ApiProperty({ example: 'PN-12345' })
    @IsString()
    @Length(2, 100)
    partNumber: string;

    @ApiProperty({ example: 'Bearing Housing - Machined' })
    @IsString()
    description: string;

    @ApiProperty({ example: 450 })
    @IsNumber()
    @Min(1)
    quantity: number;

    @ApiProperty({ example: 125.50 })
    @IsNumber()
    @Min(0)
    rate: number;

    @ApiProperty({ example: 56475.00 })
    @IsNumber()
    @Min(0)
    amount: number;
}

export class CreateInvoiceDto {
    @ApiProperty({ example: 'vendor-uuid' })
    @IsUUID()
    vendorId: string;

    @ApiProperty({ example: 'customer-uuid' })
    @IsUUID()
    customerId: string;

    @ApiProperty({ example: '2026-02-05' })
    @IsDateString()
    invoiceDate: string;

    @ApiProperty({ example: '2026-03-05', required: false })
    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @ApiProperty({ example: 'tax_invoice', enum: InvoiceType, required: false })
    @IsOptional()
    @IsEnum(InvoiceType)
    invoiceType?: InvoiceType;

    @ApiProperty({ example: 'Net 30 days', required: false })
    @IsOptional()
    @IsString()
    paymentTerms?: string;

    @ApiProperty({ example: 'As per PO #1234', required: false })
    @IsOptional()
    @IsString()
    remarks?: string;

    @ApiProperty({ type: [InvoiceItemDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];
}
