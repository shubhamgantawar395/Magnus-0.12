import { apiClient } from '@/lib/api-client';
import { PurchaseOrder, CreatePurchaseOrderDto, POStatus } from '@/types/purchase-order';

export const purchaseOrderService = {
    getAll: async (filters?: { status?: POStatus; vendorId?: string }) => {
        const response = await apiClient.get<PurchaseOrder[]>('/purchase-orders', { params: filters });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`);
        return response.data;
    },

    create: async (data: CreatePurchaseOrderDto) => {
        const response = await apiClient.post<PurchaseOrder>('/purchase-orders', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreatePurchaseOrderDto> & { status?: POStatus }) => {
        const response = await apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await apiClient.delete<void>(`/purchase-orders/${id}`);
        return response.data;
    },

    submit: async (id: string) => {
        const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/submit`);
        return response.data;
    },

    approve: async (id: string, remarks?: string) => {
        const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/approve`, { remarks });
        return response.data;
    },

    reject: async (id: string, rejectionReason: string) => {
        const response = await apiClient.post<PurchaseOrder>(`/purchase-orders/${id}/reject`, { rejectionReason });
        return response.data;
    },
};
