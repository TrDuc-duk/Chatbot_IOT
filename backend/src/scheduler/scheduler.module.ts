import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SensorsModule } from '../sensors/sensors.module';
import { CommandsModule } from '../commands/commands.module';
import { IrrigationModule } from '../irrigation/irrigation.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SensorsModule,
    CommandsModule,
    IrrigationModule,
    forwardRef(() => GatewayModule),
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
