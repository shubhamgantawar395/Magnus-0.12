import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/stock' })
export class StockStatementsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

    handleConnection(client: Socket) {
        console.log(`Client connected to stock updates: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected from stock updates: ${client.id}`);
        // Remove from all user mappings
        this.userSockets.forEach((socketIds, userId) => {
            socketIds.delete(client.id);
            if (socketIds.size === 0) {
                this.userSockets.delete(userId);
            }
        });
    }

    @SubscribeMessage('join')
    handleJoin(client: Socket, payload: { userId: string; vendorId?: string }) {
        const { userId, vendorId } = payload;
        const roomKey = vendorId ? `vendor:${vendorId}` : `user:${userId}`;

        client.join(roomKey);

        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(client.id);

        console.log(`User ${userId} joined stock room: ${roomKey}`);
        return { success: true, room: roomKey };
    }

    // Emit stock update to a vendor room
    emitStockUpdate(vendorId: string, data: any) {
        this.server.to(`vendor:${vendorId}`).emit('stock:updated', data);
    }

    // Emit stock created event
    emitStockCreated(vendorId: string, data: any) {
        this.server.to(`vendor:${vendorId}`).emit('stock:created', data);
    }

    // Emit stock verified event
    emitStockVerified(vendorId: string, data: any) {
        this.server.to(`vendor:${vendorId}`).emit('stock:verified', data);
    }
}
