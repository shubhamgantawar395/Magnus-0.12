import { apiClient as axiosInstance } from '@/lib/api-client';

export interface User {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
    isEmailVerified?: boolean;
    designation?: string;
    department?: string;
    organizationId?: string;
    vendorId?: string;
    vendor?: {
        id: string;
        companyName: string;
        vendorCode: string;
    };
    createdAt: string;
    updatedAt?: string;
}

export interface CreateUserData {
    email: string;
    password: string;
    role: string;
    firstName: string;
    lastName: string;
    phone?: string;
    designation?: string;
    department?: string;
    organizationId?: string;
    vendorId?: string;
    reportsToId?: string;
}

export const usersService = {
    async getUsers(params?: {
        role?: string;
        isActive?: boolean;
    }): Promise<User[]> {
        const response = await axiosInstance.get('/users', { params });
        return response.data;
    },

    async getUser(id: string): Promise<User> {
        const response = await axiosInstance.get(`/users/${id}`);
        return response.data;
    },

    async createUser(data: CreateUserData): Promise<User> {
        const response = await axiosInstance.post('/users', data);
        return response.data;
    },

    async updateUser(id: string, data: Partial<CreateUserData>): Promise<User> {
        const response = await axiosInstance.patch(`/users/${id}`, data);
        return response.data;
    },

    async deleteUser(id: string): Promise<void> {
        await axiosInstance.delete(`/users/${id}`);
    },

    async getVendorUsers(vendorId: string): Promise<User[]> {
        const response = await axiosInstance.get(`/users/vendor/${vendorId}/users`);
        return response.data;
    },

    async getExecutiveUsers(): Promise<User[]> {
        const response = await axiosInstance.get('/users/customer/executives');
        return response.data;
    },

    async toggleUserStatus(id: string, isActive: boolean): Promise<User> {
        const response = await axiosInstance.patch(`/users/${id}/toggle-status`, { isActive });
        return response.data;
    },

    async getUserHierarchy(id: string): Promise<any> {
        const response = await axiosInstance.get(`/users/${id}/hierarchy`);
        return response.data;
    },
};
