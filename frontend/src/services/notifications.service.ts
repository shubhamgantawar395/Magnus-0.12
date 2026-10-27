import { apiClient as axiosInstance } from '@/lib/api-client';

export interface Notification {
    id: string;
    organizationId: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    recipientIds: string[];
    isRead: boolean;
    readBy: string[];
    actionRequired: boolean;
    actionUrl?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateNotificationData {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    recipientIds: string[];
    actionRequired?: boolean;
    actionUrl?: string;
}

export const notificationsService = {
    async getNotifications(params?: {
        isRead?: boolean;
        type?: string;
    }): Promise<Notification[]> {
        const response = await axiosInstance.get('/notifications', { params });
        return response.data;
    },

    async getUnreadCount(): Promise<{ count: number }> {
        const response = await axiosInstance.get('/notifications/unread-count');
        return response.data;
    },

    async markAsRead(id: string): Promise<Notification> {
        const response = await axiosInstance.patch(`/notifications/${id}/read`);
        return response.data;
    },

    async markAllAsRead(): Promise<{ updated: number }> {
        const response = await axiosInstance.patch('/notifications/read-all');
        return response.data;
    },

    async createNotification(data: CreateNotificationData): Promise<Notification> {
        const response = await axiosInstance.post('/notifications', data);
        return response.data;
    },
};
