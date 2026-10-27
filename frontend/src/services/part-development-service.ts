import { apiClient } from '@/lib/api-client';
import {
    PartDevelopment,
    CreatePartDevelopmentDto,
    UpdatePartDevelopmentDto,
    DevStage,
} from '@/types/part-development';

export const partDevelopmentService = {
    getAll: async (params?: { vendorId?: string; partId?: string; stage?: DevStage }) => {
        const response = await apiClient.get<PartDevelopment[]>('/part-developments', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<PartDevelopment>(`/part-developments/${id}`);
        return response.data;
    },

    create: async (data: CreatePartDevelopmentDto) => {
        const response = await apiClient.post<PartDevelopment>('/part-developments', data);
        return response.data;
    },

    update: async (id: string, data: UpdatePartDevelopmentDto) => {
        const response = await apiClient.patch<PartDevelopment>(`/part-developments/${id}`, data);
        return response.data;
    },

    approve: async (id: string, remarks?: string) => {
        const response = await apiClient.post<PartDevelopment>(`/part-developments/${id}/approve`, { remarks });
        return response.data;
    },

    reject: async (id: string, rejectionReason: string) => {
        const response = await apiClient.post<PartDevelopment>(`/part-developments/${id}/reject`, { rejectionReason });
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<void>(`/part-developments/${id}`);
        return response.data;
    },
};
