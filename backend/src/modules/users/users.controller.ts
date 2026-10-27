import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    NotFoundException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager, UserRole.vendor_owner, UserRole.admin, UserRole.executive)
    @ApiOperation({ summary: 'Create a new user' })
    create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
        return this.usersService.create(createUserDto, user);
    }

    @Get()
    @Roles(UserRole.platform_admin, UserRole.admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager, UserRole.executive)
    @ApiOperation({ summary: 'List all users in your organization' })
    findAll(@CurrentUser() user: any, @Query('role') role?: UserRole, @Query('isActive') isActive?: string) {
        const filters: any = {};
        if (role) filters.role = role;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        // Enforce organization filter for non-platform admins
        if (user.role !== UserRole.platform_admin && user.organizationId) {
            filters.organizationId = user.organizationId;
        }

        return this.usersService.findAll(filters);
    }

    @Get(':id')
    @Roles(UserRole.platform_admin, UserRole.admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager, UserRole.quality_head, UserRole.customer, UserRole.vendor)
    @ApiOperation({ summary: 'Get user details' })
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.platform_admin, UserRole.admin, UserRole.director, UserRole.gm)
    @ApiOperation({ summary: 'Update user details' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(id, updateUserDto);
    }

    @Patch(':id/reset-password')
    @Roles(UserRole.platform_admin, UserRole.admin, UserRole.director, UserRole.gm)
    @ApiOperation({ summary: 'Reset a user password (admin action)' })
    resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
        return this.usersService.update(id, { password: body.password });
    }

    @Get(':id/hierarchy')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager)
    @ApiOperation({ summary: 'Get user hierarchy (subordinates)' })
    async getHierarchy(@Param('id') id: string) {
        return this.usersService.getHierarchy(id);
    }

    @Delete(':id')
    @Roles(UserRole.platform_admin, UserRole.admin)
    @ApiOperation({ summary: 'Delete a user' })
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

    @Get('vendor/:vendorId/users')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager, UserRole.vendor_owner)
    @ApiOperation({ summary: 'List all users for a specific vendor' })
    findVendorUsers(@Param('vendorId') vendorId: string, @CurrentUser() user: any) {
        // Vendor owners can only see their own vendor users
        if (user.role === UserRole.vendor_owner && user.vendorId !== vendorId) {
            throw new NotFoundException('Unauthorized');
        }
        return this.usersService.findByVendor(vendorId);
    }

    @Get('customer/executives')
    @Roles(UserRole.platform_admin, UserRole.admin, UserRole.director, UserRole.gm)
    @ApiOperation({ summary: 'List all internal org staff (all non-vendor roles)' })
    findExecutiveUsers(@CurrentUser() user: any) {
        const internalRoles = [
            UserRole.admin,
            UserRole.director,
            UserRole.gm,
            UserRole.executive,
            UserRole.plant_head,
            UserRole.production_manager,
            UserRole.ppc_manager,
            UserRole.quality_head,
            UserRole.quality_supervisor,
            UserRole.accounts_manager,
            UserRole.store_keeper,
        ];
        return this.usersService.findByRoles(internalRoles, user.organizationId);
    }

    @Patch(':id/toggle-status')
    @Roles(UserRole.platform_admin, UserRole.admin, UserRole.director, UserRole.gm, UserRole.vendor_owner)
    @ApiOperation({ summary: 'Activate or deactivate a user' })
    toggleUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.usersService.toggleUserStatus(id, body.isActive);
    }
}
