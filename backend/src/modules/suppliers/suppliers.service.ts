import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) {}

    async create(dto: CreateSupplierDto, organizationId: string) {
        const exists = await this.prisma.supplier.findFirst({
            where: { organizationId, supplierCode: dto.supplierCode },
        });
        if (exists) throw new ConflictException(`Supplier code "${dto.supplierCode}" already exists`);

        return this.prisma.supplier.create({
            data: { ...dto, organizationId },
        });
    }

    async findAll(organizationId: string, search?: string, materialType?: string) {
        const where: any = { organizationId };
        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { supplierCode: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (materialType) {
            where.materialTypes = { has: materialType };
        }

        const [data, total] = await Promise.all([
            this.prisma.supplier.findMany({
                where,
                include: { _count: { select: { parts: true } } },
                orderBy: { companyName: 'asc' },
            }),
            this.prisma.supplier.count({ where }),
        ]);

        return { data, total };
    }

    async findOne(id: string, organizationId: string) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id, organizationId },
            include: {
                parts: {
                    where: { isActive: true },
                    select: { id: true, partNumber: true, partName: true, materialType: true },
                    orderBy: { partNumber: 'asc' },
                },
            },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');
        return supplier;
    }

    async update(id: string, dto: UpdateSupplierDto, organizationId: string) {
        await this.findOne(id, organizationId);
        return this.prisma.supplier.update({ where: { id }, data: dto });
    }

    async remove(id: string, organizationId: string) {
        await this.findOne(id, organizationId);
        // Unlink parts before deleting
        await this.prisma.part.updateMany({
            where: { supplierId: id, organizationId },
            data: { supplierId: null },
        });
        await this.prisma.supplier.delete({ where: { id } });
        return { message: 'Supplier deleted' };
    }
}
