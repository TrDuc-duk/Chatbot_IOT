import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MqttService } from './mqtt.service';

/**
 * MqttModule - Module quản lý MQTT
 *
 * @Global() để các module khác có thể inject MqttService
 * mà không cần import MqttModule
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
