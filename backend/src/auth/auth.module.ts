import { Module } from '@nestjs/common';
import { TelegramAuthModule } from 'src/telegram/telegram-auth.module';
import { AuthController } from 'src/telegram/auth.controller';

@Module({
  imports: [TelegramAuthModule],
  controllers: [AuthController],
})
export class AuthModule {}

