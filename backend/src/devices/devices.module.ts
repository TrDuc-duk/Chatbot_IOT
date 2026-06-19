import { Module, forwardRef } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { GatewayModule } from '../gateway/gateway.module';
import { IrrigationModule } from '../irrigation/irrigation.module';

@Module({
  imports: [
    forwardRef(() => GatewayModule),
    forwardRef(() => IrrigationModule),
  ],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule { }
