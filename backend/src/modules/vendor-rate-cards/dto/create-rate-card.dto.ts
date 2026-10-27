import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateVendorRateCardDto {
    @ApiProperty({ example: 'Turning' })
    @IsString()
    @IsNotEmpty()
    operationType: string;

    @ApiProperty({ example: 'per_piece' })
    @IsString()
    @IsNotEmpty()
    rateType: string; // per_piece, per_hour, per_kg

    @ApiProperty({ example: 15.50 })
    @IsNumber()
    @IsNotEmpty()
    baseRate: number;

    @ApiPropertyOptional({ example: 500 })
    @IsOptional()
    @IsNumber()
    minimumCharge?: number;

    @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
    @IsOptional()
    @IsDateString()
    validFrom?: string;

    @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    validUntil?: string;
}

export class UpdateVendorRateCardDto extends CreateVendorRateCardDto {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
