import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
    constructor(private prisma: PrismaService) { }

    async create(createOrganizationDto: CreateOrganizationDto) {
        // Check for duplicate code
        const existingOrg = await this.prisma.organization.findUnique({
            where: { code: createOrganizationDto.code },
        });

        if (existingOrg) {
            throw new ConflictException('Organization with this code already exists');
        }

        const org = await this.prisma.organization.create({
            data: {
                ...createOrganizationDto,
                // Set default subscription dates if needed
                subscriptionStartDate: new Date(),
                subscriptionStatus: 'active',
            },
        });

        // Auto-create a corresponding Customer record so legacy Vendor creation works
        try {
            await this.prisma.customer.create({
                data: {
                    id: org.id,
                    organizationId: org.id,
                    companyName: org.name,
                    code: org.code,
                    contactPerson: createOrganizationDto.contactPerson || '',
                    email: createOrganizationDto.contactEmail || '',
                    phone: createOrganizationDto.contactPhone || '',
                    gstin: createOrganizationDto.gstin || '',
                }
            });
        } catch (e) {
            console.error('Failed to auto-create Customer for Organization:', e);
        }

        return org;
    }

    async findAll() {
        return this.prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true, vendors: true, purchaseOrders: true }
                }
            }
        });
    }

    async findOne(id: string) {
        const organization = await this.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: { id: true, firstName: true, email: true, role: true }
                },
                _count: {
                    select: { users: true, vendors: true, purchaseOrders: true, challans: true }
                }
            }
        });

        if (!organization) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }

        return organization;
    }

    async update(id: string, updateOrganizationDto: UpdateOrganizationDto) {
        // specific check if code is being updated to avoid collisions
        if (updateOrganizationDto.code) {
            const existingOrg = await this.prisma.organization.findUnique({
                where: { code: updateOrganizationDto.code },
            });
            if (existingOrg && existingOrg.id !== id) {
                throw new ConflictException('Organization with this code already exists');
            }
        }

        try {
            return await this.prisma.organization.update({
                where: { id },
                data: updateOrganizationDto,
            });
        } catch (error) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }
    }

    async remove(id: string) {
        // Determine if we should soft delete or hard delete. 
        // For now, let's just Soft Delete by setting isActive to false
        try {
            return await this.prisma.organization.update({
                where: { id },
                data: { isActive: false },
            });
        } catch (error) {
            throw new NotFoundException(`Organization with ID ${id} not found`);
        }
    }
}
