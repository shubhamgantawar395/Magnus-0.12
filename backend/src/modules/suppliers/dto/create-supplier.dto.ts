import { IsString, IsOptional, IsArray, IsEmail, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
    @ApiProperty() @IsString() companyName: string;
    @ApiProperty() @IsString() supplierCode: string;

    @ApiProperty({ example: ['casting', 'forging'] })
    @IsArray() @IsString({ each: true })
    materialTypes: string[];

    @ApiPropertyOptional() @IsOptional() @IsString() contactPerson?: string;
    @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() gstin?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
