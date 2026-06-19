import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MqttModule } from './mqtt/mqtt.module';
import { DevicesModule } from './devices/devices.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommandsModule } from './commands/commands.module';
import { GatewayModule } from './gateway/gateway.module';
import { GardensModule } from './gardens/gardens.module';
import { PlantsService } from './plants/plants.service';
import { PlantsModule } from './plants/plants.module';
import { SensorsService } from './sensors/sensors.service';
import { SensorsController } from './sensors/sensors.controller';
import { SensorsModule } from './sensors/sensors.module';
import { IrrigationService } from './irrigation/irrigation.service';
import { IrrigationController } from './irrigation/irrigation.controller';
import { IrrigationModule } from './irrigation/irrigation.module';
import { AutomationService } from './automation/automation.service';
import { AutomationModule } from './automation/automation.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import mqttConfig from './config/mqtt.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { DevicesService } from './devices/devices.service';

@Module({
  imports: [
    // Load config đầu tiên
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mqttConfig, databaseConfig, jwtConfig],
    }),
    PrismaModule,
    DevicesModule,
    MqttModule,
    CommandsModule,
    GatewayModule,
    GardensModule,
    PlantsModule,
    SensorsModule,
    IrrigationModule,
    AutomationModule,
    SchedulerModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [
    AppController,
    SensorsController,
    IrrigationController,
    AuthController,
    UsersController,
  ],
  providers: [
    AppService,
    PlantsService,
    SensorsService,
    IrrigationService,
    AutomationService,
    AuthService,
    UsersService,
    // Global JWT Guard - tất cả routes đều yêu cầu auth trừ @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
