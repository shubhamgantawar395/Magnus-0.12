import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEndCustomerDto {
    @ApiProperty({ description: 'Name of the End Customer (OEM Client)' })
    @IsString()
    name: string;

    @ApiProperty({ description: 'Unique code for the customer' })
    @IsString()
    code: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    contactPerson?: string;

    @ApiPropertyOptional()
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    state?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    pincode?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    gstin?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
