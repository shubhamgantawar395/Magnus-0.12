import { Controller, Get, Patch, Body, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuxStatusService, AuxStatus } from './aux-status.service';

// DTO
class UpdateAuxStatusDto {
    @IsIn(['meeting', 'available', 'lunch', 'break', 'away'])
    status: AuxStatus;
}

// Roles that can view the org-wide status panel
const EXECUTIVE_ROLES = [
    'platform_admin',
    'admin',
    'director',
    'gm',
    'plant_head',
    'executive',
];

@ApiTags('Aux Status')
@ApiBearerAuth()
@Controller('aux-status')
@UseGuards(JwtAuthGuard)
export class AuxStatusController {
    constructor(private readonly auxStatusService: AuxStatusService) {}

    /**
     * PATCH /aux-status
     * Any authenticated user updates their own status.
     */
    @Patch()
    @ApiOperation({ summary: 'Update own aux status' })
    updateOwn(@Body() dto: UpdateAuxStatusDto, @Request() req) {
        const { id, organizationId, firstName, lastName, role } = req.user;
        return this.auxStatusService.setStatus(
            id,
            organizationId,
            dto.status,
            firstName || '',
            lastName  || '',
            role,
        );
    }

    /**
     * GET /aux-status/me
     * Returns caller's own current status (defaults to 'away').
     */
    @Get('me')
    @ApiOperation({ summary: "Get caller's own aux status" })
    getOwn(@Request() req) {
        const entry = this.auxStatusService.getStatus(req.user.id);
        return entry ?? {
            userId: req.user.id,
            status: 'away' as AuxStatus,
            firstName: req.user.firstName || '',
            lastName:  req.user.lastName  || '',
            role: req.user.role,
            updatedAt: new Date(),
        };
    }

    /**
     * GET /aux-status/org
     * Returns all org-member statuses.
     * Restricted to executive / admin roles.
     */
    @Get('org')
    @ApiOperation({ summary: 'Get all org members aux statuses (executives only)' })
    getOrg(@Request() req) {
        if (!EXECUTIVE_ROLES.includes(req.user.role)) {
            throw new ForbiddenException('Only executives and admins can view org-wide statuses');
        }
        return this.auxStatusService.getOrgStatuses(req.user.organizationId);
    }
}
