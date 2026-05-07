import { AppModule } from '@/app.module';
import { CatchEverythingFilter } from '@/common/filters/catch-all.filter';
import { ResponseStatusInterceptor } from '@/common/interceptors/response-status.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_HOST,
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseStatusInterceptor());
  app.useGlobalFilters(new CatchEverythingFilter(app.get(HttpAdapterHost)));

  const port = process.env.PORT ?? 3000;
  await app.listen(port, () => {
    console.log(`[Server]\tLocal: http://localhost:${port}/`);
  });
}
void bootstrap();
