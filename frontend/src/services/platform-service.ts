import { apiClient } from '@/lib/api-client';

export interface PlatformOrganization {
    id: string;
    name: string;
    code: string;
    subscriptionStatus: string;
    subscriptionTier: string;
    isActive: boolean;
    _count: {
        users: number;
        vendors: number;
        customers: number;
        purchaseOrders: number;
    };
}

export const platformService = {
    getOrganizations: async () => {
        const response = await apiClient.get<PlatformOrganization[]>('/platform/organizations');
        return response.data;
    },

    getOrganizationLimits: async (id: string) => {
        const response = await apiClient.get(`/platform/organizations/${id}/limits`);
        return response.data;
    },

    updateOrganizationLimits: async (id: string, limits: any) => {
        const response = await apiClient.patch(`/platform/organizations/${id}/limits`, limits);
        return response.data;
    },

    toggleStatus: async (id: string, isActive: boolean) => {
        const response = await apiClient.post(`/platform/organizations/${id}/toggle`, { isActive });
        return response.data;
    },

    getKpis: async () => {
        const response = await apiClient.get('/platform/analytics');
        return response.data;
    },

    getPendingVendors: async () => {
        const response = await apiClient.get('/platform/vendors/pending');
        return response.data;
    },

    approveVendor: async (id: string) => {
        const response = await apiClient.post(`/platform/vendors/${id}/approve`);
        return response.data;
    },

    logPayment: async (id: string, amount: number, validUntil: string) => {
        const response = await apiClient.post(`/platform/organizations/${id}/billing`, { amount, validUntil });
        return response.data;
    },

    impersonate: async (id: string) => {
        const response = await apiClient.post(`/platform/organizations/${id}/impersonate`);
        return response.data;
    },

    rejectVendor: async (id: string, reason: string) => {
        const response = await apiClient.post(`/platform/vendors/${id}/reject`, { reason });
        return response.data;
    },

    getPlatformAuditLogs: async () => {
        const response = await apiClient.get('/platform/audit-logs');
        return response.data;
    },

    getExpiringSubscriptions: async () => {
        const response = await apiClient.get('/platform/subscriptions/expiring');
        return response.data;
    },

    // ─── System Settings ─────────────────────────────────────────────────────

    getSettings: async (): Promise<Array<{ key: string; isSet: boolean; maskedValue: string }>> => {
        const response = await apiClient.get('/platform/settings');
        return response.data;
    },

    saveSetting: async (key: string, value: string): Promise<{ success: boolean }> => {
        const response = await apiClient.put('/platform/settings', { key, value });
        return response.data;
    },
};
