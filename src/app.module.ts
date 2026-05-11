import { AuthModule } from '@/modules/auth/auth.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import morgan from 'morgan';
import { ProfileModule } from './modules/profile/profile.module';
import { ExamModule } from './modules/exam/exam.module';

@Module({
  imports: [AuthModule, ProfileModule, ExamModule],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(morgan('dev')).forRoutes('*');
  }
}
