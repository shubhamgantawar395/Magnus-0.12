import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'executive', 'ppc_manager')
    @ApiOperation({ summary: 'Create a new customer' })
    create(@Body() createCustomerDto: CreateCustomerDto, @Request() req) {
        return this.customersService.create(createCustomerDto, req.user.id, req.user.organizationId);
    }

    @Get()
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'production_manager', 'quality_head', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Get all customers' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    findAll(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Request() req = {} as any
    ) {
        return this.customersService.findAll(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            search,
            req.user.organizationId
        );
    }

    @Get(':id')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'production_manager', 'quality_head', 'ppc_manager', 'executive')
    @ApiOperation({ summary: 'Get customer by ID' })
    findOne(@Param('id') id: string, @Request() req = {} as any) {
        return this.customersService.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @Roles('admin', 'platform_admin', 'customer', 'director', 'gm', 'executive', 'ppc_manager')
    @ApiOperation({ summary: 'Update customer' })
    update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto, @Request() req = {} as any) {
        return this.customersService.update(id, updateCustomerDto, req.user.organizationId);
    }

    @Delete(':id')
    @Roles('admin')
    @ApiOperation({ summary: 'Delete customer' })
    remove(@Param('id') id: string, @Request() req = {} as any) {
        return this.customersService.remove(id, req.user.organizationId);
    }
}
