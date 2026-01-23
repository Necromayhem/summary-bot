import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';

import { IngestionModule } from 'src/domains/ingestion/ingestion.module';
import { TelegramAuthModule } from './telegram-auth.module';

import { BotUpdate } from './updates/bot.update';
import { TelegramChatsService } from './telegram-chats.service';
import { TelegramChatsController } from './telegram-chats.controller';

@Module({
  imports: [
    ConfigModule,
    TelegramAuthModule, // только сервис верификации Telegram
    IngestionModule,
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow('TELEGRAM_BOT_TOKEN'),
        launchOptions: {
          allowedUpdates: [
            'message',
            'edited_message',
            'my_chat_member',
            'chat_member',
          ],
        },
      }),
    }),
  ],
  providers: [BotUpdate, TelegramChatsService],
  controllers: [TelegramChatsController],
  exports: [TelegramAuthModule],
})
export class TelegramModule {}
