import { apiClient } from '@/lib/api-client';
import { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@/types/organization';

export const organizationService = {
    getAll: async () => {
        const response = await apiClient.get<Organization[]>('/organizations');
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<Organization>(`/organizations/${id}`);
        return response.data;
    },

    create: async (data: CreateOrganizationDto) => {
        const response = await apiClient.post<Organization>('/organizations', data);
        return response.data;
    },

    update: async (id: string, data: UpdateOrganizationDto) => {
        const response = await apiClient.patch<Organization>(`/organizations/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<void>(`/organizations/${id}`);
        return response.data;
    },
};
