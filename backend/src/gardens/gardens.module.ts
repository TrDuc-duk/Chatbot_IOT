import { Module, forwardRef } from '@nestjs/common';
import { GardensController } from './gardens.controller';
import { GardensService } from './gardens.service';
import { CommandsModule } from '../commands/commands.module';
import { DevicesModule } from '../devices/devices.module';
import { GatewayModule } from '../gateway/gateway.module';
import { IrrigationModule } from '../irrigation/irrigation.module';

@Module({
  imports: [
    CommandsModule,
    forwardRef(() => DevicesModule),
    forwardRef(() => GatewayModule), // forwardRef để tránh circular dependency
    forwardRef(() => IrrigationModule),
  ],
  controllers: [GardensController],
  providers: [GardensService],
  exports: [GardensService],
})
export class GardensModule { }
