import { AuthModule } from '@/modules/auth/auth.module';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import morgan from 'morgan';
import { ProfileModule } from './modules/profile/profile.module';
import { ExamsModule } from './modules/exams/exams.module';
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [AuthModule, ProfileModule, ExamsModule,
    ConfigModule.forRoot({ isGlobal: true }), // Bật tính năng đọc .env toàn cục
    ExamsModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(morgan('dev')).forRoutes('*');
  }
}
