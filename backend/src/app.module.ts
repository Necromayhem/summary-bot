import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth/auth.module';
import { TelegramModule } from './telegram/telegram.module';
import { SummarizationModule } from './domains/summarization/summarization.module';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtGlobalModule } from './auth/jwt-global.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,

    JwtGlobalModule,

    AuthModule,
    TelegramModule,
    SummarizationModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
