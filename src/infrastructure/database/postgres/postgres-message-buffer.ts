import { Injectable, Inject } from '@nestjs/common';
import { eq, asc } from 'drizzle-orm';
import { DB } from 'src/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type {
  MessageBufferPort,
  BufferMessage,
} from '../../../domains/ingestion/message-buffer.port';

import { bufferedMessages } from '../schema/buffered-messages';

@Injectable()
export class PostgresMessageBuffer implements MessageBufferPort {
  constructor(
    @Inject(DB)
    private readonly db: NodePgDatabase,
  ) {}

  /**
   * Записать одно сообщение в буфер
   */
  async append(chatId: string, msg: BufferMessage): Promise<void> {
    await this.db
      .insert(bufferedMessages)
      .values({
        chatId,
        userId: msg.userId,
        messageId: msg.messageId,
        text: msg.text,
        tsMs: msg.ts,
      })
      // защита от дублей (chat_id + message_id)
      .onConflictDoNothing({
        target: [bufferedMessages.chatId, bufferedMessages.messageId],
      });
  }

  /**
   * Получить пачку сообщений одного чата
   */
  async getBatch(chatId: string, limit = 200): Promise<BufferMessage[]> {
    const rows = await this.db
      .select({
        chatId: bufferedMessages.chatId,
        userId: bufferedMessages.userId,
        messageId: bufferedMessages.messageId,
        text: bufferedMessages.text,
        ts: bufferedMessages.tsMs,
      })
      .from(bufferedMessages)
      .where(eq(bufferedMessages.chatId, chatId))
      .orderBy(asc(bufferedMessages.tsMs), asc(bufferedMessages.id))
      .limit(limit);

    return rows;
  }

  /**
   * Очистить буфер чата (обычно после суммаризации)
   */
  async clear(chatId: string): Promise<void> {
    await this.db
      .delete(bufferedMessages)
      .where(eq(bufferedMessages.chatId, chatId));
  }
}
