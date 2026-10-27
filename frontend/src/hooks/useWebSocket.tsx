import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth-store';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export function useNotifications() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user } = useAuthStore();
    const reconnectAttempts = useRef(0);

    useEffect(() => {
        if (!user?.id) return;

        const newSocket = io(`${BACKEND_URL}/notifications`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('Connected to notifications WebSocket');
            reconnectAttempts.current = 0;
            // Join user's notification room
            newSocket.emit('join', { userId: user.id });
        });

        newSocket.on('notification:new', (notification: any) => {
            console.log('New notification received:', notification);

            // Show toast notification
            toast(
                <div className="flex flex-col gap-1" >
                    <div className="font-semibold" > {notification.title} </div>
                    < div className="text-sm text-slate-600" > {notification.message} </div>
                </div>,
                {
                    duration: 5000,
                    icon: notification.severity === 'critical' ? '🚨' :
                        notification.severity === 'high' ? '⚠️' :
                            notification.severity === 'medium' ? 'ℹ️' : '📢',
                }
            );

            // Update unread count
            setUnreadCount((prev) => prev + 1);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from notifications WebSocket');
            reconnectAttempts.current++;
        });

        newSocket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user?.id]);

    const decrementUnreadCount = () => {
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const resetUnreadCount = () => {
        setUnreadCount(0);
    };

    return {
        socket,
        unreadCount,
        setUnreadCount,
        decrementUnreadCount,
        resetUnreadCount,
    };
}

export function useStockUpdates(vendorId?: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.id) return;

        const newSocket = io(`${BACKEND_URL}/stock`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
        });

        newSocket.on('connect', () => {
            console.log('Connected to stock updates WebSocket');
            // Join appropriate rooms
            newSocket.emit('join', { userId: user.id, vendorId });
        });

        newSocket.on('stock:created', (data: any) => {
            console.log('Stock statement created:', data);
            toast.success(`New stock statement created: ${data.statementNumber}`);
            setLastUpdate(Date.now());
        });

        newSocket.on('stock:updated', (data: any) => {
            console.log('Stock statement updated:', data);
            toast(`Stock statement updated: ${data.statementNumber}`, { icon: 'ℹ️' });
            setLastUpdate(Date.now());
        });

        newSocket.on('stock:verified', (data: any) => {
            console.log('Stock statement verified:', data);
            toast.success(`Stock statement verified: ${data.statementNumber}`);
            setLastUpdate(Date.now());
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from stock updates WebSocket');
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user?.id, vendorId]);

    return { socket, lastUpdate };
}
