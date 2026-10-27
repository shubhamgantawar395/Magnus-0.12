import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Length } from 'class-validator';

export class VendorCapabilityDto {
    @ApiProperty({ example: 'CNC Turning', description: 'Process name (e.g., Turning, VMC, Grinding)' })
    @IsString()
    @Length(2, 100)
    processName: string;

    @ApiProperty({ example: 5, description: 'Number of machines available', required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    machineCount?: number;

    @ApiProperty({ example: 10000, description: 'Monthly production capacity', required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    capacityPerMonth?: number;

    @ApiProperty({ example: 'Specializes in precision parts', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}
