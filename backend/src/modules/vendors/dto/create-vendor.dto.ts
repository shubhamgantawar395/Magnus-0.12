import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsUUID, Length, Matches, MinLength } from 'class-validator';

export class CreateVendorDto {
    @ApiProperty({ example: 'abc123-uuid', required: false })
    @IsOptional()
    @IsUUID()
    customerId?: string;

    @ApiProperty({ example: 'V001' })
    @IsString()
    @Length(2, 50)
    vendorCode: string;

    @ApiProperty({ example: 'ABC Machining Works' })
    @IsString()
    @Length(2, 255)
    companyName: string;

    @ApiProperty({ example: '27AABCA5678E1Z9' })
    @IsString()
    @Length(15, 15)
    @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, {
        message: 'Invalid GSTIN format'
    })
    gstin: string;

    @ApiProperty({ example: '456 Industrial Estate', required: false })
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

    @ApiProperty({ example: '411019', required: false })
    @IsOptional()
    @IsString()
    @Length(6, 10)
    pincode?: string;

    @ApiProperty({ example: 'Suresh Patil', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    contactPerson?: string;

    @ApiProperty({ example: 'suresh@abcmachining.com', required: false })
    @IsOptional()
    @IsEmail()
    contactEmail?: string;

    @ApiProperty({ example: '+91-9876543211', required: false })
    @IsOptional()
    @IsString()
    @Length(10, 20)
    contactPhone?: string;

    // Profile Enhancements
    @ApiProperty({ example: 'https://example.com/logo.png', required: false })
    @IsOptional()
    @IsString()
    logoUrl?: string;

    @ApiProperty({ example: 'HDFC Bank', required: false })
    @IsOptional()
    @IsString()
    bankName?: string;

    @ApiProperty({ example: '50100987654321', required: false })
    @IsOptional()
    @IsString()
    accountNumber?: string;

    @ApiProperty({ example: 'HDFC0001234', required: false })
    @IsOptional()
    @IsString()
    ifscCode?: string;

    // ── Owner Portal Access (optional — creates a vendor_owner user atomically) ─
    @ApiProperty({ example: 'Suresh', required: false })
    @IsOptional()
    @IsString()
    ownerFirstName?: string;

    @ApiProperty({ example: 'Patil', required: false })
    @IsOptional()
    @IsString()
    ownerLastName?: string;

    @ApiProperty({ example: 'suresh@abcmachining.com', required: false })
    @IsOptional()
    @IsEmail()
    ownerEmail?: string;

    @ApiProperty({ example: 'SecurePass@123', required: false })
    @IsOptional()
    @IsString()
    @MinLength(6)
    ownerPassword?: string;
}
