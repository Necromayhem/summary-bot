import { Injectable, Inject, Logger } from '@nestjs/common';
import { MESSAGE_BUFFER } from './message-buffer.token';
import type { BufferMessage, MessageBufferPort } from './message-buffer.port';

const logger = new Logger('ingestion service');

@Injectable()
export class IngestionService {
  constructor(
    @Inject(MESSAGE_BUFFER) private readonly buffer: MessageBufferPort,
  ) {}

  async ingestTelegramMessage(msg: BufferMessage) {
    await this.buffer.append(msg.chatId, msg);
    logger.log(msg);
  }
}
