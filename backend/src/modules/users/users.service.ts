import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto, requestor?: any) {
        // RBAC: Validate Creator Permissions
        if (requestor) {
            const { role: creatorRole, organizationId: creatorOrgId, vendorId: creatorVendorId } = requestor;
            const targetRole = createUserDto.role;

            // 1. Cross-Tenant Protection
            if (createUserDto.organizationId && createUserDto.organizationId !== creatorOrgId) {
                // Exception: Platform Admin can create for anyone (logic simplified for now)
                if (creatorRole !== 'platform_admin' && creatorRole !== 'admin') {
                    throw new ConflictException('Cannot create user for another organization');
                }
            }

            // 2. Role Hierarchy Validation
            switch (creatorRole) {
                case UserRole.director:
                case UserRole.gm:
                case UserRole.executive:
                    if (!(
                        [
                            UserRole.production_manager,
                            UserRole.ppc_manager,
                            UserRole.quality_head,
                            UserRole.store_keeper,
                            UserRole.accounts_manager,
                            UserRole.quality_supervisor,
                            UserRole.security,
                        ] as UserRole[]
                    ).includes(targetRole)) {
                        throw new ConflictException('Not authorized to create a user with this role');
                    }
                    break;
                case UserRole.vendor_owner:
                    if (!([UserRole.vendor_ppc, UserRole.vendor_supervisor, UserRole.vendor_user] as UserRole[]).includes(targetRole)) {
                        throw new ConflictException('Vendor Owners can only create Vendor staff');
                    }
                    // Enforce Vendor ID
                    if (createUserDto.vendorId !== creatorVendorId) {
                        throw new ConflictException('Cannot create user for another vendor');
                    }
                    break;
                case UserRole.ppc_manager:
                    if (targetRole !== UserRole.vendor_owner) {
                        throw new ConflictException('PPC Managers can only create Vendor Owners');
                    }
                    if (!createUserDto.organizationId) {
                        createUserDto.organizationId = creatorOrgId;
                    } else if (createUserDto.organizationId !== creatorOrgId) {
                        throw new ConflictException('Cannot create vendor user for another organization');
                    }
                    break;
                case UserRole.production_manager:
                // case UserRole.ppc_manager: // Removed from disabled list
                case UserRole.quality_head:
                case UserRole.vendor_ppc:
                case UserRole.vendor_supervisor:
                    throw new ConflictException('This role is not authorized to create users');
            }
        }

        // Check if user already exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

        // Create user
        const { password, ...userData } = createUserDto;

        // Auto-assign context if missing (e.g. Vendor Owner creating user implies vendorId)
        if (requestor && requestor.role === UserRole.vendor_owner && !userData.vendorId) {
            userData.vendorId = requestor.vendorId;
            userData.organizationId = requestor.organizationId;
        }

        if (requestor && ([UserRole.director, UserRole.gm, UserRole.admin] as UserRole[]).includes(requestor.role) && !userData.organizationId) {
            userData.organizationId = requestor.organizationId;
        }

        const user = await this.prisma.user.create({
            data: {
                ...userData,
                passwordHash: hashedPassword,
            },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                isEmailVerified: true,
                organizationId: true,
                department: true,
                vendorId: true,
                reportsToId: true,
                designation: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }

    async findAll(filters?: { role?: UserRole; isActive?: boolean; organizationId?: string }) {
        return this.prisma.user.findMany({
            where: {
                ...filters,
                organizationId: filters?.organizationId
                    ? filters.organizationId
                    : undefined
            },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                isEmailVerified: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                isEmailVerified: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                organizationId: true,
                vendorId: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.findOne(id);

        const updateData: any = { ...updateUserDto };

        // Hash password if provided
        if (updateUserDto.password) {
            updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
            delete updateData.password;
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                isEmailVerified: true,
                organizationId: true,
                department: true,
                vendorId: true,
                reportsToId: true,
                designation: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.user.delete({
            where: { id },
        });
    }

    async updateLastLogin(id: string) {
        return this.prisma.user.update({
            where: { id },
            data: { lastLogin: new Date() },
        });
    }

    async getHierarchy(id: string) {
        const includeQuery: any = {
            subordinates: {
                include: {
                    subordinates: {
                        include: {
                            subordinates: true
                        }
                    }
                }
            }
        };

        const user = await this.prisma.user.findUnique({
            where: { id },
            include: includeQuery
        });

        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async findByVendor(vendorId: string) {
        return this.prisma.user.findMany({
            where: {
                vendorId,
            },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                designation: true,
                createdAt: true,
                vendor: {
                    select: {
                        id: true,
                        companyName: true,
                        vendorCode: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findByRoles(roles: UserRole[], organizationId?: string) {
        const where: any = {
            role: {
                in: roles,
            },
        };

        if (organizationId) {
            where.organizationId = organizationId;
        }

        return this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                designation: true,
                department: true,
                organizationId: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async toggleUserStatus(id: string, isActive: boolean) {
        await this.findOne(id); // Verify exists

        return this.prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                isActive: true,
            },
        });
    }
}
