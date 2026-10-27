import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

    handleConnection(client: Socket) {
        console.log(`Client connected to notifications: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected from notifications: ${client.id}`);
        // Remove from all user mappings
        this.userSockets.forEach((socketIds, userId) => {
            socketIds.delete(client.id);
            if (socketIds.size === 0) {
                this.userSockets.delete(userId);
            }
        });
    }

    @SubscribeMessage('join')
    handleJoin(client: Socket, payload: { userId: string }) {
        const { userId } = payload;
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(client.id);
        console.log(`User ${userId} joined notifications with socket ${client.id}`);
        return { success: true };
    }

    // Emit notification to specific users
    emitToUsers(userIds: string[], event: string, data: any) {
        userIds.forEach((userId) => {
            const socketIds = this.userSockets.get(userId);
            if (socketIds) {
                socketIds.forEach((socketId) => {
                    this.server.to(socketId).emit(event, data);
                });
            }
        });
    }

    // Emit notification to a single user
    emitToUser(userId: string, event: string, data: any) {
        this.emitToUsers([userId], event, data);
    }
}
