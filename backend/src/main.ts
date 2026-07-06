import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3080);
  const apiPrefix = config.get<string>('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: config.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AGROERP API')
    .setDescription('Agro Enterprise Platform — Core API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
  logger.log(`AGROERP API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`LAN access: http://<your-ip>:${port}/${apiPrefix}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
