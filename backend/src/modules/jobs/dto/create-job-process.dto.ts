import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Length } from 'class-validator';

export class CreateJobProcessDto {
    @ApiProperty({ example: 1, description: 'Process sequence number (1, 2, 3...)' })
    @IsInt()
    @Min(1)
    processSequence: number;

    @ApiProperty({ example: 'CNC Turning' })
    @IsString()
    @Length(2, 100)
    processName: string;

    @ApiProperty({ example: 'turning', required: false })
    @IsOptional()
    @IsString()
    @Length(2, 50)
    processType?: string;

    @ApiProperty({ example: 500, description: 'Target quantity for this process' })
    @IsInt()
    @Min(1)
    targetQuantity: number;

    @ApiProperty({ example: 'Use carbide inserts', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
