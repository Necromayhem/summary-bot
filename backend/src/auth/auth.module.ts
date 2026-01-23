import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { TelegramAuthModule } from 'src/telegram/telegram-auth.module';
import { AuthController } from 'src/telegram/auth.controller';

@Module({
  imports: [
    TelegramAuthModule,
    JwtModule, // 👈 даёт JwtService
  ],
  controllers: [AuthController],
})
export class AuthModule {}
