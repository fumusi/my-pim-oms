import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('my-pim-oms API')
    .setDescription('PIM + OMS backend — products, orders, customers, price lists, Exact Online sync')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
