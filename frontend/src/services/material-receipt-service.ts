import { apiClient } from '@/lib/api-client';
import {
    CustomerOrder,
    CreateCustomerOrderDto,
    UpdateCustomerOrderDto,
    CustomerOrderStatus,
} from '@/types/customer-order';

export const customerOrderService = {
    getAll: async (params?: { customerId?: string; status?: CustomerOrderStatus }) => {
        const response = await apiClient.get<CustomerOrder[]>('/customer-orders', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<CustomerOrder>(`/customer-orders/${id}`);
        return response.data;
    },

    create: async (data: CreateCustomerOrderDto) => {
        const response = await apiClient.post<CustomerOrder>('/customer-orders', data);
        return response.data;
    },

    update: async (id: string, data: UpdateCustomerOrderDto) => {
        const response = await apiClient.patch<CustomerOrder>(`/customer-orders/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<void>(`/customer-orders/${id}`);
        return response.data;
    },
};
