import { apiClient } from '@/lib/api-client';
import { Machine, CreateMachineDto, UpdateMachineDto } from '@/types/machine';

export const machineService = {
    getAll: async (params?: { isActive?: boolean; department?: string }) => {
        const response = await apiClient.get<Machine[]>('/machines', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<Machine>(`/machines/${id}`);
        return response.data;
    },

    create: async (data: CreateMachineDto) => {
        const response = await apiClient.post<Machine>('/machines', data);
        return response.data;
    },

    update: async (id: string, data: UpdateMachineDto) => {
        const response = await apiClient.patch<Machine>(`/machines/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<void>(`/machines/${id}`);
        return response.data;
    },
};
