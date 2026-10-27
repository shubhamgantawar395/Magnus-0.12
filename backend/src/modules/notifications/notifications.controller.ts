import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a notification (admin)' })
    create(@Body() createDto: CreateNotificationDto, @CurrentUser() user: any) {
        return this.notificationsService.create(createDto, user.organizationId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all notifications for current user' })
    @ApiQuery({ name: 'isRead', required: false, type: Boolean })
    @ApiQuery({ name: 'type', required: false })
    findAll(
        @CurrentUser() user: any,
        @Query('isRead') isRead?: string,
        @Query('type') type?: string
    ) {
        const filters: any = {};
        if (isRead !== undefined) filters.isRead = isRead === 'true';
        if (type) filters.type = type;

        return this.notificationsService.findAllForUser(user.id, filters);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    getUnreadCount(@CurrentUser() user: any) {
        return this.notificationsService.getUnreadCount(user.id);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark notification as read' })
    markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
        return this.notificationsService.markAsRead(id, user.id);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    markAllAsRead(@CurrentUser() user: any) {
        return this.notificationsService.markAllAsRead(user.id, user.organizationId);
    }
}
