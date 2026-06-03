// MUST be the first import — sets IPv4-first DNS resolution before any other
// module (e.g. secure-auth-helper) is evaluated and makes network calls.
import './preload-dns.js';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { v2 as cloudinary } from 'cloudinary';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

// Main
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Tell Express to trust the reverse proxy (like Nginx, Vercel, Render, AWS, etc.)
  // This is required so `req.ip` returns the real user's IP instead of '::1' (localhost).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173'];

  app.use(helmet());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );

  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (cloudinaryUrl) {
    const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
    if (match) {
      cloudinary.config({
        api_key: match[1],
        api_secret: match[2],
        cloud_name: match[3],
        secure: true,
      });
    } else {
      cloudinary.config({ secure: true });
    }
  } else {
    cloudinary.config({ secure: true });
  }

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`RankRush NestJS server running on port ${port}`);
}

bootstrap();
