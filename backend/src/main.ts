import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { RedisService } from './shared/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix (includes version: api/v1)
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
    new RateLimitInterceptor(app.get(RedisService)),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Cosmetics Finder API')
    .setDescription('Cosmetics Finder REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('products', 'Product management')
    .addTag('orders', 'Order management')
    .addTag('categories', 'Category management')
    .addTag('reviews', 'Review management')
    .addTag('cart', 'Shopping cart')
    .addTag('wishlist', 'Wishlist management')
    .addTag('search', 'Search functionality')
    .addTag('skin-analysis', 'AI Skin analysis')
    .addTag('promotions', 'Promotion management')
    .addTag('advertisements', 'Advertisement management')
    .addTag('admin', 'Admin endpoints')
    .addTag('analytics', 'Analytics endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = configService.get<number>('app.port') || 8080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
void bootstrap();
