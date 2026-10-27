import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateKnowledgeItemDto {
    category: string;
    title: string;
    content: string;
    tags?: string[];
    visibleToRoles?: string[];
}

export interface UpdateKnowledgeItemDto {
    category?: string;
    title?: string;
    content?: string;
    tags?: string[];
    visibleToRoles?: string[];
    isActive?: boolean;
}

export interface CreateFeedbackDto {
    query: string;
    response: string;
    rating: number; // 1 = thumbs up, -1 = thumbs down
    reason?: string;
    comment?: string;
}

// All non-vendor, non-platform internal roles that can receive knowledge injection
const INTERNAL_ROLES = [
    'director', 'gm', 'executive', 'admin', 'plant_head',
    'ppc_manager', 'production_manager', 'store_keeper',
    'accounts_manager', 'quality_head', 'quality_supervisor', 'security',
];

@Injectable()
export class AiKnowledgeService {
    constructor(private readonly prisma: PrismaService) {}

    // ── Admin: list all items ────────────────────────────────────────────────
    async findAll(organizationId: string, category?: string, isActive?: boolean) {
        const where: any = { organizationId };
        if (category) where.category = category;
        if (isActive !== undefined) where.isActive = isActive;

        return this.prisma.knowledgeItem.findMany({
            where,
            orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
            include: {
                createdBy: { select: { firstName: true, lastName: true, role: true } },
            },
        });
    }

    // ── Admin: create ────────────────────────────────────────────────────────
    async create(organizationId: string, userId: string, dto: CreateKnowledgeItemDto) {
        return this.prisma.knowledgeItem.create({
            data: {
                organizationId,
                createdById: userId,
                category: dto.category as any,
                title: dto.title,
                content: dto.content,
                tags: dto.tags ?? [],
                visibleToRoles: dto.visibleToRoles ?? [],
            },
        });
    }

    // ── Admin: update ────────────────────────────────────────────────────────
    async update(organizationId: string, id: string, dto: UpdateKnowledgeItemDto) {
        const item = await this.prisma.knowledgeItem.findFirst({ where: { id, organizationId } });
        if (!item) throw new NotFoundException('Knowledge item not found');

        return this.prisma.knowledgeItem.update({
            where: { id },
            data: {
                ...(dto.category ? { category: dto.category as any } : {}),
                ...(dto.title !== undefined ? { title: dto.title } : {}),
                ...(dto.content !== undefined ? { content: dto.content } : {}),
                ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
                ...(dto.visibleToRoles !== undefined ? { visibleToRoles: dto.visibleToRoles } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            },
        });
    }

    // ── Admin: soft-delete ───────────────────────────────────────────────────
    async remove(organizationId: string, id: string) {
        const item = await this.prisma.knowledgeItem.findFirst({ where: { id, organizationId } });
        if (!item) throw new NotFoundException('Knowledge item not found');
        return this.prisma.knowledgeItem.update({ where: { id }, data: { isActive: false } });
    }

    // ── Used by ai-context.service: fetch items visible to a given role ──────
    async getForPrompt(organizationId: string, role: string): Promise<string> {
        const items = await this.prisma.knowledgeItem.findMany({
            where: {
                organizationId,
                isActive: true,
                // Item is visible if: visibleToRoles is empty (all) OR role is in the list
                OR: [
                    { visibleToRoles: { isEmpty: true } },
                    { visibleToRoles: { has: role } },
                ],
            },
            orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
        });

        if (!items.length) return '';

        // Group by category
        const groups = new Map<string, typeof items>();
        for (const item of items) {
            const cat = item.category;
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat)!.push(item);
        }

        const categoryLabels: Record<string, string> = {
            customer_profile: 'Customer Profiles',
            vendor_profile: 'Vendor Profiles',
            part_profile: 'Part Profiles',
            business_rule: 'Business Rules',
            sop: 'Standard Operating Procedures',
            company_context: 'Company Context',
        };

        const lines: string[] = ['── BUSINESS KNOWLEDGE BASE ──'];
        for (const [cat, catItems] of groups) {
            lines.push(`\n[${categoryLabels[cat] ?? cat}]`);
            for (const item of catItems) {
                lines.push(`  ${item.title}: ${item.content}`);
            }
        }

        return lines.join('\n');
    }

    // ── Feedback: submit ─────────────────────────────────────────────────────
    async submitFeedback(organizationId: string, userId: string, dto: CreateFeedbackDto) {
        return this.prisma.aiFeedback.create({
            data: {
                organizationId,
                userId,
                query: dto.query,
                response: dto.response,
                rating: dto.rating,
                reason: dto.reason,
                comment: dto.comment,
            },
        });
    }

    // ── Admin: list feedback ─────────────────────────────────────────────────
    async getFeedback(organizationId: string, ratingFilter?: number) {
        const where: any = { organizationId };
        if (ratingFilter !== undefined) where.rating = ratingFilter;

        return this.prisma.aiFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                user: { select: { firstName: true, lastName: true, role: true } },
            },
        });
    }
}
