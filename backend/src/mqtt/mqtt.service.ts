import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { MqttClient } from 'mqtt';

/**
 * MqttService - Service quản lý kết nối và giao tiếp với MQTT Broker
 *
 * Responsibilities:
 * - Kết nối tới Mosquitto broker
 * - Subscribe các topics từ ESP32
 * - Publish lệnh điều khiển xuống ESP32
 * - Emit events khi nhận được message
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private isSubscribed = false; // Track subscription state

  // Map để lưu các message handlers
  // Key: topic pattern, Value: ARRAY of callback functions (support multiple handlers per pattern)
  private messageHandlers: Map<string, Array<(topic: string, payload: any) => void>> =
    new Map();

  constructor(private configService: ConfigService) { }

  /**
   * Kết nối MQTT khi module khởi tạo
   */
  async onModuleInit() {
    await this.connect();
  }

  /**
   * Đóng kết nối khi app shutdown
   */
  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('MQTT disconnected');
    }
  }

  /**
   * Kết nối tới MQTT Broker
   */
  private async connect(): Promise<void> {
    const brokerUrl =
      this.configService.get<string>('mqtt.brokerUrl') ||
      'mqtt://localhost:1883';
    const username = this.configService.get<string>('mqtt.username');
    const password = this.configService.get<string>('mqtt.password');
    const clientId = this.configService.get<string>('mqtt.clientId');

    return new Promise((resolve, reject) => {
      this.logger.log(`Connecting to MQTT broker:  ${brokerUrl}`);

      this.client = mqtt.connect(brokerUrl, {
        clientId,
        username: username || undefined,
        password: password || undefined,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      // Event:  Kết nối thành công
      this.client.on('connect', () => {
        this.logger.log('✅ MQTT connected successfully');
        // DON'T subscribe here - wait for handlers to be registered first
        resolve();
      });

      // Event: Nhận message
      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });

      // Event: Lỗi
      this.client.on('error', (error) => {
        this.logger.error('❌ MQTT error:', error.message);
        reject(error);
      });

      // Event: Mất kết nối
      this.client.on('offline', () => {
        this.logger.warn('⚠️ MQTT offline');
      });

      // Event: Đang reconnect
      this.client.on('reconnect', () => {
        this.logger.log('🔄 MQTT reconnecting...');
      });
    });
  }

  /**
   * Ensure topics are subscribed (called after handlers are registered)
   */
  ensureSubscribed(): void {
    if (this.isSubscribed) {
      this.logger.debug('Already subscribed to topics');
      return;
    }

    if (!this.client || !this.client.connected) {
      this.logger.warn('Cannot subscribe: MQTT client not connected');
      return;
    }

    this.subscribeToTopics();
    this.isSubscribed = true;
  }

  /**
   * Subscribe các topics cần lắng nghe
   */
  private subscribeToTopics(): void {
    const topics = [
      'garden/+/sensors', // Dữ liệu cảm biến từ ESP32
      'garden/+/status', // Trạng thái thiết bị từ ESP32
      'garden/+/command/ack', // Phản hồi lệnh từ ESP32
    ];

    topics.forEach((topic) => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${topic}:`, err.message);
        } else {
          this.logger.log(`📡 Subscribed to:  ${topic}`);
        }
      });
    });
  }

  /**
   * Xử lý message nhận được từ broker
   */
  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const message = JSON.parse(payload.toString());
      this.logger.debug(`📨 Received [${topic}]: ${JSON.stringify(message)}`);
      this.logger.debug(
        `🔍 Current handlers count: ${this.messageHandlers.size}`,
      );
      this.logger.debug(
        `🔍 Handler patterns: ${Array.from(this.messageHandlers.keys()).join(', ')}`,
      );
      // Gọi tất cả handlers đã đăng ký cho các patterns match
      this.messageHandlers.forEach((handlers, pattern) => {
        if (this.topicMatchesPattern(topic, pattern)) {
          // Call ALL handlers registered for this pattern
          handlers.forEach((handler) => {
            try {
              handler(topic, message);
            } catch (error) {
              this.logger.error(
                `Handler error for pattern ${pattern}:`,
                error.message,
              );
            }
          });
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to parse message from ${topic}:`,
        error.message,
      );
    }
  }

  /**
   * Kiểm tra topic có match với pattern không
   * Pattern: garden/+/sensors
   * Topic: garden/1/sensors
   * => true
   */
  private topicMatchesPattern(topic: string, pattern: string): boolean {
    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    if (topicParts.length !== patternParts.length) {
      return false;
    }

    return patternParts.every((part, index) => {
      return part === '+' || part === '#' || part === topicParts[index];
    });
  }

  /**
   * Đăng ký handler cho một topic pattern
   *
   * @param pattern - Topic pattern (VD: 'garden/+/sensors')
   * @param handler - Callback function khi nhận được message
   */
  registerHandler(
    pattern: string,
    handler: (topic: string, payload: any) => void,
  ): void {
    // Get existing handlers for this pattern or create new array
    const existingHandlers = this.messageHandlers.get(pattern) || [];
    existingHandlers.push(handler);
    this.messageHandlers.set(pattern, existingHandlers);

    this.logger.log(
      `📝 Registered handler for:  ${pattern} (total: ${existingHandlers.length})`,
    );
  }

  /**
   * Publish message tới một topic
   *
   * @param topic - Topic đích (VD: 'garden/1/command')
   * @param message - Object message sẽ được JSON. stringify
   */
  publish(topic: string, message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const payload = JSON.stringify(message);

      this.client.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Failed to publish to ${topic}:`, err.message);
          reject(err);
        } else {
          this.logger.debug(`📤 Published [${topic}]: ${payload}`);
          resolve();
        }
      });
    });
  }

  /**
   * Extract garden ID từ topic
   * Topic: garden/123/sensors => gardenId:  123
   */
  extractGardenIdFromTopic(topic: string): number | null {
    const match = topic.match(/^garden\/(\d+)\//);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}
