import { PartialType } from '@nestjs/swagger';
import { CreateStockStatementDto } from './create-stock-statement.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateStockStatementDto extends PartialType(CreateStockStatementDto) {
    @ApiPropertyOptional({ example: 'submitted' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    items?: UpdateStockStatementItemDto[];
}

export class UpdateStockStatementItemDto {
    @IsString()
    id: string;

    @IsOptional()
    @IsString()
    remarks?: string;

    @IsOptional()
    physicalStock?: number;
}
