import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorRateCardDto, UpdateVendorRateCardDto } from './dto/create-rate-card.dto';

@Injectable()
export class VendorRateCardsService {
    constructor(private prisma: PrismaService) { }

    async create(vendorId: string, dto: CreateVendorRateCardDto) {
        // Verify vendor exists
        const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        return this.prisma.vendorRateCard.create({
            data: {
                vendorId,
                ...dto,
                validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
                validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
            },
        });
    }

    async findAll(vendorId: string) {
        return this.prisma.vendorRateCard.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findActive(vendorId: string, operationType?: string) {
        const now = new Date();
        return this.prisma.vendorRateCard.findFirst({
            where: {
                vendorId,
                isActive: true,
                operationType: operationType ? { equals: operationType, mode: 'insensitive' } : undefined,
                validFrom: { lte: now },
                OR: [
                    { validUntil: null },
                    { validUntil: { gte: now } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async update(id: string, dto: UpdateVendorRateCardDto) {
        return this.prisma.vendorRateCard.update({
            where: { id },
            data: {
                ...dto,
                validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
                validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
            }
        });
    }

    async remove(id: string) {
        return this.prisma.vendorRateCard.delete({ where: { id } });
    }
}
