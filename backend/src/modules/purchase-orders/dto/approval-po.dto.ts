import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApprovalPurchaseOrderDto {
    @ApiPropertyOptional({ example: 'Approved as per discussion.' })
    @IsOptional()
    @IsString()
    remarks?: string;
}

export class RejectPurchaseOrderDto {
    @ApiProperty({ example: 'Incorrect pricing.' })
    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}
