import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateStockStatementDto {
    @ApiProperty({ example: 'vendor-uuid' })
    @IsUUID()
    vendorId: string;

    @ApiProperty({ example: '2024-02-01T00:00:00Z' })
    @IsDateString()
    periodFrom: string;

    @ApiProperty({ example: '2024-02-29T23:59:59Z' })
    @IsDateString()
    periodTo: string;

    @ApiProperty({ example: 'Monthly reconciliation', required: false })
    @IsOptional()
    @IsString()
    remarks?: string;
}
