/**
 * Các types dùng chung cho MQTT payload
 */

// Các action điều khiển thiết bị
export type DeviceAction = 'pump_on' | 'pump_off' | 'led_on' | 'led_off';

// Trạng thái của command
export type CommandStatus =
  | 'pending'
  | 'sent'
  | 'success'
  | 'failed'
  | 'timeout';

/**
 * Payload lệnh gửi từ Server → ESP32
 */
export interface CommandPayload {
  command_id: string;
  action: DeviceAction;
  parameters?: {
    duration_seconds?: number;
  };
  timestamp: number;
}

/**
 * Payload ACK từ ESP32 → Server
 */
export interface CommandAckPayload {
  command_id: string;
  device_id: string;
  status: 'success' | 'failed';
  message?: string;
  timestamp: number;
}

/**
 * Payload sensor data từ ESP32 → Server
 */
export interface SensorPayload {
  device_id: string;
  timestamp: number;
  sensors: {
    temperature?: number;
    air_humidity?: number;
    soil_moisture?: number;
    is_dark?: boolean;
  };
}

/**
 * Payload device status từ ESP32 → Server
 */
export interface DeviceStatusPayload {
  device_id: string;
  timestamp: number;
  pump_status: boolean;
  led_status: boolean;
  is_connected: boolean;
}

/**
 * WebSocket events gửi cho client
 */
export enum WsEvents {
  // Server → Client
  SENSOR_UPDATE = 'sensor: update',
  DEVICE_STATUS = 'device:status',
  COMMAND_ACK = 'command:ack',
  GARDEN_UPDATE = 'garden:update',

  // Client → Server
  JOIN_GARDEN = 'garden:join',
  LEAVE_GARDEN = 'garden:leave',
}
