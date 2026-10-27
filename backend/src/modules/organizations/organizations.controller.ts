import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @Roles(UserRole.platform_admin)
    @ApiOperation({ summary: 'Create a new organization (Platform Admin only)' })
    @ApiResponse({ status: 201, description: 'The organization has been successfully created.' })
    create(@Body() createOrganizationDto: CreateOrganizationDto) {
        return this.organizationsService.create(createOrganizationDto);
    }

    @Get('mine')
    @ApiOperation({ summary: 'Get current user\'s own organization details' })
    findMine(@Request() req) {
        return this.organizationsService.findOne(req.user.organizationId);
    }

    @Get()
    @Roles(UserRole.platform_admin)
    @ApiOperation({ summary: 'List all organizations (Platform Admin only)' })
    findAll() {
        return this.organizationsService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.platform_admin)
    @ApiOperation({ summary: 'Get organization details' })
    findOne(@Param('id') id: string) {
        return this.organizationsService.findOne(id);
    }

    @Patch('mine')
    @Roles(UserRole.admin, UserRole.director, UserRole.gm, UserRole.platform_admin)
    @ApiOperation({ summary: 'Update current user\'s organization details' })
    updateMine(@Request() req, @Body() updateOrganizationDto: UpdateOrganizationDto) {
        return this.organizationsService.update(req.user.organizationId, updateOrganizationDto);
    }

    @Patch(':id')
    @Roles(UserRole.platform_admin)
    @ApiOperation({ summary: 'Update organization details' })
    update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
        return this.organizationsService.update(id, updateOrganizationDto);
    }

    @Delete(':id')
    @Roles(UserRole.platform_admin)
    @ApiOperation({ summary: 'Deactivate organization' })
    remove(@Param('id') id: string) {
        return this.organizationsService.remove(id);
    }
}
