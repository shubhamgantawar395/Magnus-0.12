import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePartDto {
    @ApiProperty({ example: 'BFG-2234' })
    @IsString()
    @Length(1, 50)
    partNumber: string;

    @ApiProperty({ example: 'Cylinder Head Cover', required: false })
    @IsOptional()
    @IsString()
    partName?: string;

    @ApiProperty({ example: 'abc123-uuid', required: false })
    @IsOptional()
    @IsString()
    endCustomerId?: string;

    @ApiProperty({ example: 'DWG-2234-Rev2', required: false })
    @IsOptional()
    @IsString()
    drawingNumber?: string;

    @ApiProperty({ example: 'Rev A', required: false })
    @IsOptional()
    @IsString()
    revision?: string;

    @ApiProperty({ example: 'EN24', required: false })
    @IsOptional()
    @IsString()
    materialGrade?: string;

    @ApiProperty({ example: '8483', required: false })
    @IsOptional()
    @IsString()
    hsnCode?: string;

    @ApiProperty({ example: 'NOS', required: false })
    @IsOptional()
    @IsString()
    unitOfMeasure?: string;

    @ApiProperty({ example: 1.25, required: false })
    @IsOptional()
    @IsNumber()
    weight?: number;

    @ApiProperty({ example: 'Cylinder head cover for 2W engine', required: false })
    @IsOptional()
    @IsString()
    description?: string;
}
