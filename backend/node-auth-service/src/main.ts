import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createLogger } from './common/logger.config';

async function bootstrap() {
  const logger = createLogger();
  const app = await NestFactory.create(AppModule, { logger });
  
  // Get port from environment variable, default to 3000
  const port = process.env.PORT || 3000;
  
  // Enable CORS for mobile apps
  app.enableCors();
  
  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('Amicis Auth Service API')
    .setDescription('Authentication broker service for multi-tenant retail platform')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('health', 'Health check endpoints')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  await app.listen(port);
  console.log(`NestJS Auth Service is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api`);
}
bootstrap();
