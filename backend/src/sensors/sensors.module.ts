import { Module, forwardRef } from '@nestjs/common';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { GardensModule } from '../gardens/gardens.module';

@Module({
  imports: [forwardRef(() => GardensModule)],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
