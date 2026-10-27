import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { VendorStatus } from '@prisma/client';

@Injectable()
export class PlatformService implements OnModuleInit {
    private readonly logger = new Logger(PlatformService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) { }

    /** Ensure SystemSetting table exists — auto-creates on first boot */
    async onModuleInit() {
        try {
            await this.prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "SystemSetting" (
                    "key"       TEXT         NOT NULL,
                    "value"     TEXT         NOT NULL,
                    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
                    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
                );
            `);
            this.logger.log('SystemSetting table ready');
        } catch (e: any) {
            this.logger.warn('SystemSetting table init: ' + e?.message);
        }
    }

    async findAllOrganizations() {
        return this.prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { users: true, vendors: true, customers: true, purchaseOrders: true }
                }
            }
        });
    }

    async getOrganizationLimits(id: string) {
        const org = await this.prisma.organization.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                isActive: true,
                maxUsers: true,
                maxVendors: true,
                maxChallansPerMonth: true,
                subscriptionStatus: true,
                subscriptionTier: true,
                stripeCustomerId: true,
                subscriptionEndDate: true,
            }
        });
        if (!org) throw new NotFoundException('Organization not found');
        return org;
    }

    async updateOrganizationLimits(id: string, adminId: string, limits: any) {
        // Log the change
        await this.prisma.platformAuditLog.create({
            data: {
                action: 'UPDATE_LIMITS',
                adminId,
                organizationId: id,
                details: JSON.stringify(limits)
            }
        });

        // Update the limits
        return this.prisma.organization.update({
            where: { id },
            data: limits,
            select: {
                id: true,
                name: true,
                maxUsers: true,
                maxVendors: true,
                subscriptionStatus: true,
            }
        });
    }

    async toggleOrganizationStatus(id: string, adminId: string, isActive: boolean) {
        await this.prisma.platformAuditLog.create({
            data: {
                action: isActive ? 'ENABLE_ORGANIZATION' : 'DISABLE_ORGANIZATION',
                adminId,
                organizationId: id,
                details: `Status set to ${isActive}`
            }
        });

        return this.prisma.organization.update({
            where: { id },
            data: { isActive },
        });
    }

    async getKpis() {
        const [totalOrgs, totalVendors, totalUsers, mrrOrgs] = await Promise.all([
            this.prisma.organization.count(),
            this.prisma.vendor.count(),
            this.prisma.user.count(),
            this.prisma.organization.count({ where: { subscriptionTier: { not: 'trial' } } })
        ]);
        return { totalOrgs, totalVendors, totalUsers, mrrOrgs };
    }

    async getPendingVendors() {
        return this.prisma.vendor.findMany({
            where: { status: VendorStatus.pending },
            orderBy: { createdAt: 'desc' },
            include: { capabilities: true }
        });
    }

    async approveGlobalVendor(id: string, adminId: string) {
        await this.prisma.platformAuditLog.create({
            data: { action: 'APPROVE_VENDOR', adminId, details: `Approved Vendor ${id}` }
        });
        return this.prisma.vendor.update({
            where: { id },
            data: { status: VendorStatus.approved, approvedAt: new Date(), approvedById: adminId }
        });
    }

    async logManualPayment(orgId: string, adminId: string, amount: number, validUntil: Date) {
        await this.prisma.platformAuditLog.create({
            data: { action: 'LOG_PAYMENT', adminId, organizationId: orgId, details: `Payment logged. Valid until ${validUntil}` }
        });
        return this.prisma.organization.update({
            where: { id: orgId },
            data: { subscriptionEndDate: validUntil, subscriptionTier: 'paid', subscriptionStatus: 'active' }
        });
    }

    async rejectGlobalVendor(id: string, adminId: string, reason: string) {
        await this.prisma.platformAuditLog.create({
            data: { action: 'REJECT_VENDOR', adminId, details: `Rejected Vendor ${id}. Reason: ${reason || 'Not specified'}` }
        });
        return this.prisma.vendor.update({
            where: { id },
            data: { status: VendorStatus.rejected }
        });
    }

    async getPlatformAuditLogs() {
        return this.prisma.platformAuditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                admin: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                organization: {
                    select: { id: true, name: true }
                }
            }
        });
    }

    async getExpiringSubscriptions() {
        const in14Days = new Date();
        in14Days.setDate(in14Days.getDate() + 14);
        return this.prisma.organization.findMany({
            where: {
                isActive: true,
                subscriptionEndDate: { lte: in14Days }
            },
            orderBy: { subscriptionEndDate: 'asc' },
            select: {
                id: true, name: true, subscriptionTier: true,
                subscriptionEndDate: true, isActive: true,
                _count: { select: { users: true } }
            }
        });
    }

    async impersonateOrganization(orgId: string, platformAdminId: string) {
        await this.prisma.platformAuditLog.create({
            data: { action: 'IMPERSONATE_LOGIN', adminId: platformAdminId, organizationId: orgId, details: 'Requested impersonation token' }
        });
        // Find the primary admin user of this organization
        const adminUser = await this.prisma.user.findFirst({
            where: { organizationId: orgId, role: 'admin' },
            orderBy: { createdAt: 'asc' }
        });
        if (!adminUser) throw new NotFoundException('No admin user found for this organization to impersonate');

        // Generate a token as if they logged in
        const payload = {
            sub: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            organizationId: adminUser.organizationId,
            department: adminUser.department,
            vendorId: adminUser.vendorId
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: adminUser.id,
                email: adminUser.email,
                role: adminUser.role,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                organizationId: adminUser.organizationId
            }
        };
    }

    // ─── System Settings ─────────────────────────────────────────────────────

    /** Secret keys whose values are masked in GET responses */
    private readonly SECRET_KEYS = ['ANTHROPIC_API_KEY'];

    async getSettings(): Promise<{ key: string; isSet: boolean; maskedValue: string }[]> {
        const rows: any[] = await this.prisma.$queryRawUnsafe(`SELECT key, value FROM "SystemSetting"`);
        return rows.map((r: any) => ({
            key: r.key,
            isSet: true,
            maskedValue: this.SECRET_KEYS.includes(r.key)
                ? String(r.value).replace(/^(sk-ant-[a-zA-Z0-9]{4}).*([a-zA-Z0-9]{4})$/, '$1…$2')
                : r.value,
        }));
    }

    async saveSetting(key: string, value: string, adminId: string): Promise<{ success: boolean }> {
        // Upsert via raw SQL — works even before prisma generate
        await this.prisma.$executeRawUnsafe(`
            INSERT INTO "SystemSetting" (key, value, "updatedAt")
            VALUES ($1, $2, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW()
        `, key, value);

        await this.prisma.platformAuditLog.create({
            data: {
                action: 'UPDATE_SYSTEM_SETTING',
                adminId,
                details: `Updated setting: ${key}`,
            },
        });
        return { success: true };
    }

    /** Called by AiService to read API key from DB at runtime */
    async getSettingValue(key: string): Promise<string | null> {
        const rows: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT value FROM "SystemSetting" WHERE key = $1`, key
        );
        return rows[0]?.value ?? null;
    }
}
