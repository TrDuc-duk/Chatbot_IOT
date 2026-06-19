import { registerAs } from '@nestjs/config';

/**
 * MQTT Broker configuration
 *
 * Truy cập: configService.get('mqtt.brokerUrl')
 */
export default registerAs('mqtt', () => ({
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || '',

  // Topics pattern
  topics: {
    // ESP32 gửi dữ liệu cảm biến
    sensors: 'garden/+/sensors',
    // ESP32 gửi trạng thái thiết bị
    status: 'garden/+/status',
    // Server gửi lệnh điều khiển
    command: 'garden/{gardenId}/command',
    // ESP32 phản hồi lệnh
    commandAck: 'garden/+/command/ack',
  },
  //   + là wildcard, match với bất kỳ giá trị nào
  // (VD: garden/+/sensors match với garden/1/sensors, garden/2/sensors, ...)
  // {gardenId} sẽ được replace khi publish

  // Client options
  clientId: `smart-garden-server-${Date.now()}`,
  reconnectPeriod: 5000, // 5 giây
  connectTimeout: 30000, // 30 giây
}));
