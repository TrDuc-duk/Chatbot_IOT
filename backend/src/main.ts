import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Tạo NestJS application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ==========================================
  // Global Prefix - Tất cả API bắt đầu với /api
  // ==========================================
  app.setGlobalPrefix('api');

  // ==========================================
  // Global Pipes - Validation
  // ==========================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Loại bỏ các field không có trong DTO
      forbidNonWhitelisted: true, // Throw error nếu có field lạ
      transform: true, // Tự động transform types
      transformOptions: {
        enableImplicitConversion: true, // Tự động convert string -> number, ...
      },
    }),
  );

  // ==========================================
  // Global Filters - Exception handling
  // ==========================================
  app.useGlobalFilters(new HttpExceptionFilter());

  // ==========================================
  // Global Interceptors - Response transform
  // ==========================================
  app.useGlobalInterceptors(new TransformInterceptor());

  // ==========================================
  // CORS - Cho phép Mobile App / Web App gọi API
  // ==========================================
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    credentials: true,
  });

  // ==========================================
  // Swagger API Documentation
  // ==========================================
  const config = new DocumentBuilder()
    .setTitle('Smart Garden API')
    .setDescription('Backend API for Smart Garden IoT System')
    .setVersion('1.0')
    .addTag('Devices', 'ESP32 device management')
    .addTag('Gardens', 'Garden management')
    .addTag('Plants', 'Plant dictionary')
    .addTag('Irrigation', 'Irrigation control')
    .addTag('Auth', 'Authentication')
    .addBearerAuth() // Thêm JWT auth cho Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // Truy cập tại /docs

  // ==========================================
  // Start server
  // ==========================================
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🌱 Smart Garden Server is running on:  http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/docs`);
  logger.log(
    `🔌 MQTT Broker: ${process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'}`,
  );
}

bootstrap();
