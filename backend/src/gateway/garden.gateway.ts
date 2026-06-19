import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsEvents } from '../common/types/mqtt-payload.types';

/**
 * GardenGateway - WebSocket Gateway cho real-time communication
 *
 * Clients (Mobile App) có thể:
 * - Join vào room của garden để nhận updates
 * - Nhận real-time sensor data
 * - Nhận device status updates
 * - Nhận command acknowledgments
 */
@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
  namespace: '/garden', // ws://localhost:3000/garden
})
export class GardenGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(GardenGateway.name);

  @WebSocketServer()
  server: Server;

  // Theo dõi số clients đang kết nối
  private connectedClients: Map<string, Set<number>> = new Map(); // socketId -> Set<gardenId>

  afterInit() {
    this.logger.log('🔌 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`📱 Client connected: ${client.id}`);
    this.connectedClients.set(client.id, new Set());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`📱 Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Client join vào room của garden để nhận updates
   * Event: garden: join
   * Payload: { gardenId:  number }
   */
  @SubscribeMessage(WsEvents.JOIN_GARDEN)
  handleJoinGarden(
    @MessageBody() data: { gardenId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `garden_${data.gardenId}`;
    client.join(roomName);

    // Track garden cho client này
    const gardens = this.connectedClients.get(client.id);
    if (gardens) {
      gardens.add(data.gardenId);
    }

    this.logger.log(`📱 Client ${client.id} joined room: ${roomName}`);

    // Gửi confirmation
    return {
      success: true,
      message: `Joined garden ${data.gardenId}`,
      room: roomName,
    };
  }

  /**
   * Client rời khỏi room của garden
   * Event: garden:leave
   * Payload: { gardenId: number }
   */
  @SubscribeMessage(WsEvents.LEAVE_GARDEN)
  handleLeaveGarden(
    @MessageBody() data: { gardenId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `garden_${data.gardenId}`;
    client.leave(roomName);

    const gardens = this.connectedClients.get(client.id);
    if (gardens) {
      gardens.delete(data.gardenId);
    }

    this.logger.log(`📱 Client ${client.id} left room: ${roomName}`);

    return {
      success: true,
      message: `Left garden ${data.gardenId}`,
    };
  }

  // ==========================================
  // SERVER -> CLIENT EMITTERS
  // ==========================================

  /**
   * Emit sensor data update cho garden
   */
  emitSensorUpdate(
    gardenId: number,
    data: {
      temperature?: number;
      airHumidity?: number;
      soilMoisture?: number;
      isDark?: boolean;
      timestamp: string;
    },
  ) {
    const roomName = `garden_${gardenId}`;
    this.server.to(roomName).emit(WsEvents.SENSOR_UPDATE, {
      gardenId,
      ...data,
    });

    this.logger.debug(
      `📡 Emitted sensor update to ${roomName}: temp=${data.temperature}`,
    );
  }

  /**
   * Emit device status update (pump, led)
   */
  emitDeviceStatus(
    gardenId: number,
    data: {
      isPumpOn?: boolean;
      isLedOn?: boolean;
      isConnected?: boolean;
      action?: string;
      timestamp: string;
    },
  ) {
    const roomName = `garden_${gardenId}`;
    this.server.to(roomName).emit(WsEvents.DEVICE_STATUS, {
      gardenId,
      ...data,
    });

    this.logger.debug(
      `📡 Emitted device status to ${roomName}: ${JSON.stringify(data)}`,
    );
  }

  /**
   * Emit command acknowledgment
   */
  emitCommandAck(
    gardenId: number,
    data: {
      commandId: string;
      action: string;
      status: string;
      message?: string;
      timestamp: string;
    },
  ) {
    const roomName = `garden_${gardenId}`;
    this.server.to(roomName).emit(WsEvents.COMMAND_ACK, {
      gardenId,
      ...data,
    });

    this.logger.debug(
      `📡 Emitted command ACK to ${roomName}: ${data.commandId} - ${data.status}`,
    );
  }

  /**
   * Emit generic garden update
   */
  emitGardenUpdate(gardenId: number, data: any) {
    const roomName = `garden_${gardenId}`;
    this.server.to(roomName).emit(WsEvents.GARDEN_UPDATE, {
      gardenId,
      ...data,
    });
  }

  /**
   * Lấy số clients đang theo dõi garden
   */
  getGardenSubscriberCount(gardenId: number): number {
    const roomName = `garden_${gardenId}`;
    const room = this.server.sockets.adapter.rooms.get(roomName);
    return room ? room.size : 0;
  }

  /**
   * Broadcast message tới tất cả clients
   */
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
