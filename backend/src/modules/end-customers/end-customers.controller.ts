import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EndCustomersService } from './end-customers.service';
import { CreateEndCustomerDto } from './dto/create-end-customer.dto';
import { UpdateEndCustomerDto } from './dto/update-end-customer.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('End Customers')
@ApiBearerAuth()
@Controller('end-customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EndCustomersController {
    constructor(private readonly endCustomersService: EndCustomersService) { }

    @Post()
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager)
    @ApiOperation({ summary: 'Create a new end customer' })
    @ApiResponse({ status: 201, description: 'The customer has been successfully created.' })
    create(@Body() createEndCustomerDto: CreateEndCustomerDto) {
        return this.endCustomersService.create(createEndCustomerDto);
    }

    @Get()
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager, UserRole.quality_head)
    @ApiOperation({ summary: 'List all end customers' })
    findAll() {
        return this.endCustomersService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager, UserRole.quality_head)
    @ApiOperation({ summary: 'Get end customer details' })
    findOne(@Param('id') id: string) {
        return this.endCustomersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm, UserRole.production_manager, UserRole.ppc_manager)
    @ApiOperation({ summary: 'Update end customer' })
    update(@Param('id') id: string, @Body() updateEndCustomerDto: UpdateEndCustomerDto) {
        return this.endCustomersService.update(id, updateEndCustomerDto);
    }

    @Delete(':id')
    @Roles(UserRole.platform_admin, UserRole.director, UserRole.gm)
    @ApiOperation({ summary: 'Delete end customer' })
    remove(@Param('id') id: string) {
        return this.endCustomersService.remove(id);
    }
}
