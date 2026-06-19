import { Module, forwardRef } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { CommandsModule } from '../commands/commands.module';
import { IrrigationModule } from '../irrigation/irrigation.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [CommandsModule, IrrigationModule, forwardRef(() => GatewayModule)],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
