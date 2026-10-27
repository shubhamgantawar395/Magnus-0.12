import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TrayCalculationResult {
    partNumber: string;
    quantity: number;
    trayCapacity: number;
    traysRequired: number;
    lastTrayQuantity: number;
}

@Injectable()
export class TrayService {
    constructor(private prisma: PrismaService) { }

    async setTrayCapacity(
        organizationId: string,
        customerId: string,
        partNumber: string,
        capacity: number,
        description?: string,
        unit?: string,
        stages?: Array<{ sequence: number; name: string }>,
    ) {
        if (capacity <= 0) {
            throw new BadRequestException('Tray capacity must be greater than 0');
        }

        return this.prisma.trayConfiguration.upsert({
            where: { organizationId_customerId_partNumber: { organizationId, customerId, partNumber } },
            update: {
                capacity,
                description,
                unit: unit || 'NOS',
                ...(stages !== undefined && { stages: stages as any }),
            },
            create: {
                organizationId,
                customerId,
                partNumber,
                capacity,
                description,
                unit: unit || 'NOS',
                stages: (stages ?? []) as any,
            }
        });
    }

    async getTrayCapacity(organizationId: string, customerId: string, partNumber: string) {
        const config = await this.prisma.trayConfiguration.findUnique({
            where: { organizationId_customerId_partNumber: { organizationId, customerId, partNumber } }
        });

        if (!config) {
            throw new NotFoundException(`Tray configuration not found for part number: ${partNumber}`);
        }

        return config;
    }

    async getAllTrayConfigurations(organizationId: string, customerId?: string, page: number = 1, limit: number = 50, search?: string) {
        const skip = (page - 1) * limit;

        const where: any = { organizationId };
        if (customerId) {
            where.customerId = customerId;
        }

        if (search) {
            where.OR = [
                { partNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [configs, total] = await Promise.all([
            this.prisma.trayConfiguration.findMany({
                where,
                skip,
                take: limit,
                orderBy: { partNumber: 'asc' }
            }),
            this.prisma.trayConfiguration.count({ where })
        ]);

        return {
            data: configs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async deleteTrayConfiguration(organizationId: string, customerId: string, partNumber: string) {
        const config = await this.prisma.trayConfiguration.findUnique({
            where: { organizationId_customerId_partNumber: { organizationId, customerId, partNumber } }
        });

        if (!config) {
            throw new NotFoundException(`Tray configuration not found for part number: ${partNumber}`);
        }

        await this.prisma.trayConfiguration.delete({
            where: { organizationId_customerId_partNumber: { organizationId, customerId, partNumber } }
        });

        return { message: 'Tray configuration deleted successfully' };
    }

    async calculateTraysRequired(organizationId: string, customerId: string, partNumber: string, quantity: number): Promise<TrayCalculationResult> {
        if (quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than 0');
        }

        const config = await this.getTrayCapacity(organizationId, customerId, partNumber);
        const traysRequired = Math.ceil(quantity / config.capacity);
        const lastTrayQuantity = quantity % config.capacity || config.capacity;

        return {
            partNumber,
            quantity,
            trayCapacity: config.capacity,
            traysRequired,
            lastTrayQuantity
        };
    }

    async calculateTraysForMultipleItems(organizationId: string, customerId: string, items: { partNumber: string; quantity: number }[]): Promise<{
        items: TrayCalculationResult[];
        totalTrays: number;
    }> {
        const calculations = await Promise.all(
            items.map(item => this.calculateTraysRequired(organizationId, customerId, item.partNumber, item.quantity))
        );

        const totalTrays = calculations.reduce((sum, calc) => sum + calc.traysRequired, 0);

        return {
            items: calculations,
            totalTrays
        };
    }
}
