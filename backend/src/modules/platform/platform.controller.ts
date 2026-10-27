import { Controller, Get, Post, Put, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Platform Admin')
@ApiBearerAuth()
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.platform_admin)
export class PlatformController {
    constructor(private readonly service: PlatformService) { }

    @Get('organizations')
    @ApiOperation({ summary: 'List all tier 2 organizations and their counts' })
    findAllOrganizations() {
        return this.service.findAllOrganizations();
    }

    @Get('organizations/:id/limits')
    @ApiOperation({ summary: 'Get limits and subscription status of an organization' })
    getOrganizationLimits(@Param('id') id: string) {
        return this.service.getOrganizationLimits(id);
    }

    @Patch('organizations/:id/limits')
    @ApiOperation({ summary: 'Update limits and settings for an organization' })
    updateOrganizationLimits(@Param('id') id: string, @Body() body: any, @Request() req) {
        return this.service.updateOrganizationLimits(id, req.user.id, body);
    }

    @Post('organizations/:id/toggle')
    @ApiOperation({ summary: 'Activate or suspend an organization' })
    toggleOrganizationStatus(@Param('id') id: string, @Body('isActive') isActive: boolean, @Request() req) {
        return this.service.toggleOrganizationStatus(id, req.user.id, isActive);
    }

    @Get('analytics')
    @ApiOperation({ summary: 'Get global top-level KPIs for super admin' })
    getKpis() {
        return this.service.getKpis();
    }

    @Get('vendors/pending')
    @ApiOperation({ summary: 'Get queue of pending global vendors waiting for approval' })
    getPendingVendors() {
        return this.service.getPendingVendors();
    }

    @Post('vendors/:id/approve')
    @ApiOperation({ summary: 'Approve a pending global vendor' })
    approveGlobalVendor(@Param('id') id: string, @Request() req) {
        return this.service.approveGlobalVendor(id, req.user.id);
    }

    @Post('vendors/:id/reject')
    @ApiOperation({ summary: 'Reject a pending global vendor application' })
    rejectGlobalVendor(@Param('id') id: string, @Body('reason') reason: string, @Request() req) {
        return this.service.rejectGlobalVendor(id, req.user.id, reason);
    }

    @Get('audit-logs')
    @ApiOperation({ summary: 'Get platform audit log (admin actions only)' })
    getPlatformAuditLogs(
        @Request() req,
    ) {
        return this.service.getPlatformAuditLogs();
    }

    @Get('subscriptions/expiring')
    @ApiOperation({ summary: 'Get organizations with subscriptions expiring within 14 days' })
    getExpiringSubscriptions() {
        return this.service.getExpiringSubscriptions();
    }


    @Post('organizations/:id/billing')
    @ApiOperation({ summary: 'Log a manual payment and extend subscription access' })
    logManualPayment(
        @Param('id') id: string,
        @Body('amount') amount: number,
        @Body('validUntil') validUntil: string,
        @Request() req
    ) {
        return this.service.logManualPayment(id, req.user.id, amount, new Date(validUntil));
    }

    @Post('organizations/:id/impersonate')
    @ApiOperation({ summary: 'Generate a JWT login token for a Tier 2 Admin' })
    impersonateOrganization(@Param('id') id: string, @Request() req) {
        return this.service.impersonateOrganization(id, req.user.id);
    }

    // ─── Platform System Settings ────────────────────────────────────────────

    @Get('settings')
    @ApiOperation({ summary: 'Get platform system settings (keys only, values masked for secrets)' })
    getSettings() {
        return this.service.getSettings();
    }

    @Put('settings')
    @ApiOperation({ summary: 'Save or update a platform system setting' })
    saveSettings(@Body() body: { key: string; value: string }, @Request() req) {
        return this.service.saveSetting(body.key, body.value, req.user.id);
    }
}
