import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
    @ApiProperty({ example: 'Aaniry Manufacturing Pvt Ltd' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'AANIRY001' })
    @IsString()
    code: string;

    @ApiPropertyOptional({ example: '27ABCDE1234F1Z5' })
    @IsOptional()
    @IsString()
    gstin?: string;

    @ApiPropertyOptional({ example: 'ABCDE1234F' })
    @IsOptional()
    @IsString()
    pan?: string;

    @ApiPropertyOptional({ example: '123, Industrial Area' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: 'Pune' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: 'Maharashtra' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ example: '411001' })
    @IsOptional()
    @IsString()
    pincode?: string;

    @ApiPropertyOptional({ example: 'John Doe' })
    @IsOptional()
    @IsString()
    contactPerson?: string;

    @ApiPropertyOptional({ example: 'john@aaniry.com' })
    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @ApiPropertyOptional({ example: '+91 9876543210' })
    @IsOptional()
    @IsString()
    contactPhone?: string;

    @ApiPropertyOptional({ enum: ['trial', 'basic', 'professional', 'enterprise'], default: 'trial' })
    @IsOptional()
    @IsString()
    subscriptionTier?: string;

    @ApiPropertyOptional({ default: 5 })
    @IsOptional()
    maxUsers?: number;

    @ApiPropertyOptional({ description: 'Array of plant/location details' })
    @IsOptional()
    plants?: any;
}
