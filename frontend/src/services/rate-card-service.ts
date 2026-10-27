import { apiClient } from "@/lib/api-client";
import { VendorRateCard, CreateRateCardDto, UpdateRateCardDto } from "@/types/rate-card";

export const rateCardService = {
    getAll: async (vendorId: string) => {
        const response = await apiClient.get<VendorRateCard[]>(`/vendors/${vendorId}/rate-cards`);
        return response.data;
    },

    getActive: async (vendorId: string, operation?: string) => {
        const response = await apiClient.get<VendorRateCard>(`/vendors/${vendorId}/rate-cards/active`, {
            params: { operation }
        });
        return response.data;
    },

    create: async (vendorId: string, data: CreateRateCardDto) => {
        const response = await apiClient.post<VendorRateCard>(`/vendors/${vendorId}/rate-cards`, data);
        return response.data;
    },

    update: async (vendorId: string, id: string, data: UpdateRateCardDto) => {
        const response = await apiClient.patch<VendorRateCard>(`/vendors/${vendorId}/rate-cards/${id}`, data);
        return response.data;
    },

    delete: async (vendorId: string, id: string) => {
        const response = await apiClient.delete<void>(`/vendors/${vendorId}/rate-cards/${id}`);
        return response.data;
    },
};
