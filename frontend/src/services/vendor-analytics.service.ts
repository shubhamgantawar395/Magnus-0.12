import { apiClient } from '@/lib/api-client';

export interface VendorAnalytics {
    overview: {
        qualityScore: number;
        deliveryScore: number;
        overallRating: string;
        totalOrders: number;
        totalDelivered: number;
    };
    trends: {
        month: string;
        quality: number;
        delivery: number;
        cost: number;
    }[];
}

export const vendorAnalyticsService = {
    async getMyAnalytics(): Promise<VendorAnalytics> {
        const response = await apiClient.get('/vendors/me/analytics');
        return response.data;
    },

    async getVendorReadiness(vendorId: string): Promise<any> {
        const response = await apiClient.get(`/vendors/${vendorId}/readiness`);
        return response.data;
    },

    async getAllReadiness(): Promise<any[]> {
        const response = await apiClient.get('/vendors/readiness');
        return response.data;
    }
};
