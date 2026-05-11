import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import morgan from 'morgan';
import { AuthModule } from './modules/auth/auth.module';
import { ExamModule } from './modules/exam/exam.module';
import { ProfileModule } from './modules/profile/profile.module';
import { RoomModule } from './modules/room/room.module';
import { ExamsModule } from './modules/exams/exams.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule, ProfileModule, ExamModule, RoomModule,
    ConfigModule.forRoot({ isGlobal: true }),
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
