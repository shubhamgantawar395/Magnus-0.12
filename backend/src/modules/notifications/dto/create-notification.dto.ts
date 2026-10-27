import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
    @ApiProperty({ description: 'Notification type', example: 'job_overdue' })
    @IsString()
    type: string;

    @ApiProperty({ description: 'Severity level', enum: ['low', 'medium', 'high', 'critical'] })
    @IsEnum(['low', 'medium', 'high', 'critical'])
    severity: string;

    @ApiProperty({ description: 'Notification title' })
    @IsString()
    title: string;

    @ApiProperty({ description: 'Notification message' })
    @IsString()
    message: string;

    @ApiPropertyOptional({ description: 'Referenced entity type' })
    @IsOptional()
    @IsString()
    entityType?: string;

    @ApiPropertyOptional({ description: 'Referenced entity ID' })
    @IsOptional()
    @IsString()
    entityId?: string;

    @ApiProperty({ description: 'Recipient user IDs', type: [String] })
    @IsArray()
    recipientIds: string[];

    @ApiPropertyOptional({ description: 'Action required flag' })
    @IsOptional()
    @IsBoolean()
    actionRequired?: boolean;

    @ApiPropertyOptional({ description: 'Action URL' })
    @IsOptional()
    @IsString()
    actionUrl?: string;
}
