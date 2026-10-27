import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartDto } from './dto/create-part.dto';
import { CreatePartOperationDto, UpdatePartOperationDto } from './dto/create-part-operation.dto';
import { UserRole } from '@prisma/client';

// Roles allowed to mutate the job cycle (operations)
const JOB_CYCLE_EDITOR_ROLES: UserRole[] = [
    UserRole.admin,
    UserRole.director,
    UserRole.gm,
    UserRole.plant_head,
    UserRole.production_manager,
];

@Injectable()
export class PartsService {
    constructor(private prisma: PrismaService) {}

    // ── Parts CRUD ───────────────────────────────────────────────────────────

    async create(dto: CreatePartDto, organizationId: string) {
        const existing = await this.prisma.part.findUnique({
            where: { organizationId_partNumber: { organizationId, partNumber: dto.partNumber } },
        });
        if (existing) throw new ConflictException(`Part number "${dto.partNumber}" already exists`);

        if (dto.endCustomerId) {
            const customer = await this.prisma.endCustomer.findFirst({
                where: { id: dto.endCustomerId, organizationId },
            });
            if (!customer) throw new NotFoundException('Customer not found');
        }

        return this.prisma.part.create({
            data: { ...dto, organizationId },
            include: { endCustomer: { select: { id: true, name: true, code: true } } },
        });
    }

    async findAll(organizationId: string, endCustomerId?: string, search?: string) {
        const where: any = { organizationId, isActive: true };
        if (endCustomerId) where.endCustomerId = endCustomerId;
        if (search) {
            where.OR = [
                { partNumber: { contains: search, mode: 'insensitive' } },
                { partName: { contains: search, mode: 'insensitive' } },
                { drawingNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.part.findMany({
            where,
            include: {
                endCustomer: { select: { id: true, name: true, code: true } },
                _count: { select: { partOperations: { where: { isActive: true } } } },
            },
            orderBy: [{ endCustomerId: 'asc' }, { partNumber: 'asc' }],
        });
    }

    async findOne(id: string, organizationId: string) {
        const part = await this.prisma.part.findFirst({
            where: { id, organizationId },
            include: {
                endCustomer: { select: { id: true, name: true, code: true } },
                partOperations: {
                    where: { isActive: true },
                    orderBy: { sequenceNumber: 'asc' },
                    include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
                },
            },
        });
        if (!part) throw new NotFoundException('Part not found');
        return part;
    }

    async update(id: string, dto: Partial<CreatePartDto>, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.part.update({
            where: { id },
            data: dto,
            include: { endCustomer: { select: { id: true, name: true, code: true } } },
        });
    }

    // ── Job Cycle (Operations) ───────────────────────────────────────────────

    private assertCanEditJobCycle(role: UserRole) {
        if (!JOB_CYCLE_EDITOR_ROLES.includes(role)) {
            throw new ForbiddenException(
                'Only Production Managers, Plant Heads, and Leadership can modify the job cycle',
            );
        }
    }

    async getOperations(partId: string, organizationId: string) {
        await this.findOne(partId, organizationId); // validates ownership
        return this.prisma.partOperation.findMany({
            where: { partId, isActive: true },
            orderBy: { sequenceNumber: 'asc' },
            include: { createdBy: { select: { id: true, firstName: true, lastName: true, role: true } } },
        });
    }

    async addOperation(partId: string, dto: CreatePartOperationDto, userId: string, userRole: UserRole, organizationId: string) {
        this.assertCanEditJobCycle(userRole);
        await this.findOne(partId, organizationId);

        // Check for sequence number conflict — only among active operations
        const conflict = await this.prisma.partOperation.findFirst({
            where: { partId, sequenceNumber: dto.sequenceNumber, isActive: true },
        });
        if (conflict) {
            throw new ConflictException(
                `Sequence number ${dto.sequenceNumber} is already used. Use a different sequence (e.g. ${dto.sequenceNumber + 5}).`,
            );
        }

        // Purge any soft-deleted records with the same sequence so the unique index doesn't block the INSERT
        await this.prisma.partOperation.deleteMany({
            where: { partId, sequenceNumber: dto.sequenceNumber, isActive: false },
        });

        return this.prisma.partOperation.create({
            data: { ...dto, partId, createdById: userId },
            include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
    }

    async updateOperation(partId: string, opId: string, dto: UpdatePartOperationDto, userRole: UserRole, organizationId: string) {
        this.assertCanEditJobCycle(userRole);
        await this.findOne(partId, organizationId);

        const op = await this.prisma.partOperation.findFirst({ where: { id: opId, partId } });
        if (!op) throw new NotFoundException('Operation not found');

        return this.prisma.partOperation.update({
            where: { id: opId },
            data: dto,
            include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
    }

    async deleteOperation(partId: string, opId: string, userRole: UserRole, organizationId: string) {
        this.assertCanEditJobCycle(userRole);
        await this.findOne(partId, organizationId);

        const op = await this.prisma.partOperation.findFirst({ where: { id: opId, partId } });
        if (!op) throw new NotFoundException('Operation not found');

        // Hard-delete so the sequence number slot is freed and can be reused
        return this.prisma.partOperation.delete({ where: { id: opId } });
    }

    async reorderOperations(
        partId: string,
        operations: { id: string; sequenceNumber: number }[],
        userRole: UserRole,
        organizationId: string,
    ) {
        this.assertCanEditJobCycle(userRole);
        await this.findOne(partId, organizationId);

        // Update all in a transaction
        await this.prisma.$transaction(
            operations.map(({ id, sequenceNumber }) =>
                this.prisma.partOperation.update({ where: { id }, data: { sequenceNumber } }),
            ),
        );

        return this.getOperations(partId, organizationId);
    }

    // ── Dispatch target by part number (global stock statement inline edit) ──

    async updateDispatchTargetByNumber(partNumber: string, dispatchTarget: number, organizationId: string) {
        const part = await this.prisma.part.findFirst({ where: { partNumber, organizationId } });
        if (!part) throw new NotFoundException(`Part ${partNumber} not found`);
        return this.prisma.part.update({
            where: { id: part.id },
            data: { dispatchTarget },
            select: { id: true, partNumber: true, dispatchTarget: true },
        });
    }

    // ── End-customer list (for dropdowns) ───────────────────────────────────

    async getEndCustomers(organizationId: string) {
        return this.prisma.endCustomer.findMany({
            where: { organizationId, isActive: true },
            select: { id: true, name: true, code: true, gstin: true, contactPerson: true, phone: true, email: true, city: true, state: true },
            orderBy: { name: 'asc' },
        });
    }
}
