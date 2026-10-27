import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TrayService } from './tray.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('trays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trays')
export class TrayController {
    constructor(private readonly trayService: TrayService) { }

    @Post('config')
    @Roles('admin', 'customer', 'executive', 'ppc_manager', 'director', 'gm', 'production_manager', 'quality_head')
    @ApiOperation({ summary: 'Set tray capacity for a part number' })
    setTrayCapacity(
        @Req() req,
        @Body() body: {
            customerId: string;
            partNumber: string;
            capacity: number;
            description?: string;
            unit?: string;
            stages?: Array<{ sequence: number; name: string }>;
        }
    ) {
        return this.trayService.setTrayCapacity(
            req.user.organizationId,
            body.customerId,
            body.partNumber,
            body.capacity,
            body.description,
            body.unit,
            body.stages,
        );
    }


    @Get('config')
    @Roles('admin', 'customer', 'vendor', 'executive', 'ppc_manager', 'director', 'gm', 'quality_head')
    @ApiOperation({ summary: 'Get all tray configurations' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'customerId', required: false, type: String })
    getAllConfigurations(
        @Req() req,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('customerId') customerId?: string
    ) {
        return this.trayService.getAllTrayConfigurations(
            req.user.organizationId,
            customerId,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 50,
            search
        );
    }

    @Get('config/:partNumber')
    @Roles('admin', 'customer', 'vendor', 'executive', 'ppc_manager', 'director', 'gm', 'quality_head')
    @ApiOperation({ summary: 'Get tray capacity for a part number' })
    getTrayCapacity(@Req() req, @Param('partNumber') partNumber: string, @Query('customerId') customerId: string) {
        return this.trayService.getTrayCapacity(req.user.organizationId, customerId, partNumber);
    }

    @Delete('config/:partNumber')
    @Roles('admin', 'director', 'gm')
    @ApiOperation({ summary: 'Delete tray configuration' })
    deleteTrayConfiguration(@Req() req, @Param('partNumber') partNumber: string, @Query('customerId') customerId: string) {
        return this.trayService.deleteTrayConfiguration(req.user.organizationId, customerId, partNumber);
    }

    @Post('calculate')
    @Roles('admin', 'customer', 'director', 'gm')
    @ApiOperation({ summary: 'Calculate trays required for given quantity' })
    calculateTrays(
        @Req() req,
        @Body() body: { customerId: string; partNumber: string; quantity: number }
    ) {
        return this.trayService.calculateTraysRequired(req.user.organizationId, body.customerId, body.partNumber, body.quantity);
    }

    @Post('calculate-multiple')
    @Roles('admin', 'customer', 'director', 'gm')
    @ApiOperation({ summary: 'Calculate trays for multiple items' })
    calculateMultipleTrays(
        @Req() req,
        @Body() body: { customerId: string; items: { partNumber: string; quantity: number }[] }
    ) {
        return this.trayService.calculateTraysForMultipleItems(req.user.organizationId, body.customerId, body.items);
    }
}
