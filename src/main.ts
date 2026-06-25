import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

const REQUIRED_ENV_VARS = ['OPENAI_API_KEY', 'OPEN_EXCHANGE_RATES_APP_ID'];

async function bootstrap() {
  // Fail fast if required environment variables are missing — better to crash
  // at startup with a clear message than to fail silently on the first request.
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const app = await NestFactory.create(AppModule);

  // Global validation pipe — transform:true enables @Transform decorators in DTOs
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Global exception filter — centralizes error logging and enforces a consistent
  // JSON error shape across the entire application
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation setup
  const config = new DocumentBuilder()
    .setTitle('Wizybot Chatbot API')
    .setDescription(
      'API endpoint for AI customer support chatbot with product search and currency conversion tools',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api`);
}

void bootstrap();
