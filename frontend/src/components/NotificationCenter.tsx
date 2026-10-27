'use client';

import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useWebSocket';
import { notificationsService, type Notification } from '@/services/notifications.service';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const { unreadCount, setUnreadCount, decrementUnreadCount } = useNotifications();

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    useEffect(() => {
        // Fetch initial unread count
        fetchUnreadCount();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await notificationsService.getNotifications();
            setNotifications(data);
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const { count } = await notificationsService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await notificationsService.markAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, isRead: true } : n
                )
            );
            decrementUnreadCount();
            toast.success('Notification marked as read');
        } catch (error: any) {
            console.error('Error marking notification as read:', error);
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsService.markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, isRead: true }))
            );
            setUnreadCount(0);
            toast.success('All notifications marked as read');
        } catch (error: any) {
            console.error('Error marking all as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    const getSeverityColor = (severity: string) => {
        const colors: Record<string, string> = {
            critical: 'bg-red-100 text-red-800',
            high: 'bg-orange-100 text-orange-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-blue-100 text-blue-800',
        };
        return colors[severity] || colors.medium;
    };

    const getSeverityIcon = (severity: string) => {
        const icons: Record<string, string> = {
            critical: '🚨',
            high: '⚠️',
            medium: 'ℹ️',
            low: '📢',
        };
        return icons[severity] || icons.medium;
    };

    return (
        <div className="relative">
            {/* Bell Icon Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-700" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Notification Panel */}
                    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-[600px] flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-slate-900">Notifications</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 rounded hover:bg-slate-100"
                                >
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMarkAllAsRead}
                                    className="w-full"
                                >
                                    <CheckCheck className="w-4 h-4 mr-2" />
                                    Mark all as read
                                </Button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center text-slate-500">
                                    Loading notifications...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`p-4 hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-2xl flex-shrink-0">
                                                    {getSeverityIcon(notification.severity)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-semibold text-slate-900 text-sm">
                                                            {notification.title}
                                                        </h4>
                                                        <Badge className={`flex-shrink-0 ${getSeverityColor(notification.severity)}`}>
                                                            {notification.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs text-slate-400">
                                                            {new Date(notification.createdAt).toLocaleString()}
                                                        </span>
                                                        {!notification.isRead && (
                                                            <button
                                                                onClick={() => handleMarkAsRead(notification.id)}
                                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                            >
                                                                Mark as read
                                                            </button>
                                                        )}
                                                    </div>
                                                    {notification.actionUrl && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2 w-full text-xs"
                                                        >
                                                            View Details
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
