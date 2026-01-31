import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'node:path';

async function bootstrap() {
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:50051',
        package: 'auth',
        protoPath: join(process.cwd(), 'proto', 'auth.proto'),
      },
    },
  );
  await grpcApp.listen();
  console.log(' 🚀 Auth service is running on port 50051');
}
bootstrap();
