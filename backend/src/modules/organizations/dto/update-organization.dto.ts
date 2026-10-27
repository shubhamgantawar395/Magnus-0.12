import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
    @ApiPropertyOptional({ description: 'Active status of the organization' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
