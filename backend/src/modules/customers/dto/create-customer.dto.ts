import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, Length } from 'class-validator';

export class CreateCustomerDto {
    @ApiProperty({ example: 'Aaniry Overseas Pvt. Ltd.' })
    @IsString()
    @Length(2, 255)
    companyName: string;

    @ApiProperty({ example: '27AABCA1234E1Z5', description: 'GST Identification Number', required: false })
    @IsOptional()
    @IsString()
    gstin?: string;

    @ApiProperty({ example: '123 Industrial Area, Phase 2', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: 'Pune', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    city?: string;

    @ApiProperty({ example: 'Maharashtra', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    state?: string;

    @ApiProperty({ example: '411014', required: false })
    @IsOptional()
    @IsString()
    @Length(6, 10)
    pincode?: string;

    @ApiProperty({ example: 'Rajesh Kumar', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    contactPerson?: string;

    @ApiProperty({ example: 'rajesh@aaniry.com', required: false })
    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @ApiProperty({ example: '+91-9876543210', required: false })
    @IsOptional()
    @IsString()
    @Length(10, 20)
    contactPhone?: string;
}
