import { AuthModule } from '@/modules/auth/auth.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import morgan from 'morgan';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(morgan('dev')).forRoutes('*');
  }
}
