import { Module, forwardRef } from '@nestjs/common';
import { IrrigationController } from './irrigation.controller';
import { IrrigationService } from './irrigation.service';
import { GardensModule } from '../gardens/gardens.module';

@Module({
  imports: [forwardRef(() => GardensModule)],
  controllers: [IrrigationController],
  providers: [IrrigationService],
  exports: [IrrigationService],
})
export class IrrigationModule {}
