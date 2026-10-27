import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseOrderDto } from './create-po.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { POStatus } from '@prisma/client';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
    @ApiPropertyOptional({ enum: POStatus })
    @IsOptional()
    @IsEnum(POStatus)
    status?: POStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
