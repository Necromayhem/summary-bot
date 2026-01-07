import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './updates/bot.update';
import { IngestionModule } from 'src/domains/ingestion/ingestion.module';

@Module({
  imports: [
    ConfigModule,
    IngestionModule,
    TelegrafModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          token: configService.getOrThrow('TELEGRAM_BOT_TOKEN'),
        };
      },
    }),
  ],
  providers: [TelegramService, BotUpdate],
  controllers: [],
})
export class TelegramModule {}
