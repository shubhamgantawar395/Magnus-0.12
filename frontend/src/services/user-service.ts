import { apiClient } from '@/lib/api-client';
import { User, CreateUserDto, UpdateUserDto } from '@/types/user';

export const userService = {
    getAll: async (params?: { role?: string; isActive?: boolean }) => {
        const response = await apiClient.get<User[]>('/users', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<User>(`/users/${id}`);
        return response.data;
    },

    create: async (data: CreateUserDto) => {
        const response = await apiClient.post<User>('/users', data);
        return response.data;
    },

    update: async (id: string, data: UpdateUserDto) => {
        const response = await apiClient.patch<User>(`/users/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<void>(`/users/${id}`);
        return response.data;
    },

    resetPassword: async (id: string, password: string) => {
        const response = await apiClient.patch<void>(`/users/${id}/reset-password`, { password });
        return response.data;
    },

    getHierarchy: async (id: string) => {
        const response = await apiClient.get<User>(`/users/${id}/hierarchy`);
        return response.data;
    }
};
