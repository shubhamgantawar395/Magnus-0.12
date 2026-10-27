import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyStockStatementItemDto {
    @ApiProperty()
    @IsString()
    itemId: string;

    @ApiProperty()
    @IsNumber()
    physicalStock: number;

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    remarks?: string;
}

export class VerifyStockStatementDto {
    @ApiProperty({ type: [VerifyStockStatementItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VerifyStockStatementItemDto)
    items: VerifyStockStatementItemDto[];

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    verifierComments?: string;

    @ApiProperty({ enum: ['verified', 'rejected'] })
    @IsString()
    action: 'verified' | 'rejected';
}
