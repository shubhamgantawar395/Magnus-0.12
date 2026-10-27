import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProcessDto {
    @ApiProperty({ example: 250, description: 'Quantity completed in this update' })
    @IsInt()
    @Min(0)
    quantityCompleted: number;

    @ApiProperty({ example: 5, description: 'Quantity rejected', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    quantityRejected?: number;

    @ApiProperty({ example: 2, description: 'Quantity sent for rework', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    quantityRework?: number;

    @ApiProperty({ example: 'Tool breakage during operation', required: false })
    @IsOptional()
    remarks?: string;
}
