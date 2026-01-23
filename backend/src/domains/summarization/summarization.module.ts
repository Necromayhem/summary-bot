import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { DatabaseModule } from 'src/database/database.module';
import { TelegramAuthModule } from 'src/telegram/telegram-auth.module';

import { SummarizationService } from './summarization.service';
import { SummarizationController } from './summarization.controller';

import { DigestController } from './digest.controller';
import { DigestProcessor } from './digest.processor';
import { DIGEST_QUEUE } from './digest.queue';

import { MESSAGE_BUFFER } from '../ingestion/message-buffer.token';
import { PostgresMessageBuffer } from 'src/infrastructure/database/postgres/postgres-message-buffer';

import { LLM } from './summarization.token';
import { OpenAiLlm } from '../../infrastructure/llm/openai-llm';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule,
    TelegramAuthModule,

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.getOrThrow('REDIS_HOST'),
          port: Number(cfg.getOrThrow('REDIS_PORT')),
          password: cfg.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    BullModule.registerQueue({ name: DIGEST_QUEUE }),
  ],
  controllers: [SummarizationController, DigestController],
  providers: [
    SummarizationService,
    DigestProcessor,

    { provide: MESSAGE_BUFFER, useClass: PostgresMessageBuffer },
    { provide: LLM, useClass: OpenAiLlm },
  ],
  exports: [SummarizationService],
})
export class SummarizationModule {}
