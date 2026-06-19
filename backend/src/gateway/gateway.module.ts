import { Module } from '@nestjs/common';
import { GardenGateway } from './garden.gateway';

@Module({
  providers: [GardenGateway],
  exports: [GardenGateway],
})
export class GatewayModule {}
