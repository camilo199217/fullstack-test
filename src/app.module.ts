import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [
    // Load .env variables globally so all services can access them via ConfigService
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    // Global rate limiting: max 10 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    ChatbotModule,
  ],
  providers: [
    // Apply the rate limit guard to every route in the application
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
