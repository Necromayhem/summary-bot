import { Injectable, Inject } from '@nestjs/common';
import { eq, asc, and, lte, sql, desc, gte } from 'drizzle-orm';
import { DB } from 'src/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type {
  MessageBufferPort,
  BufferMessage,
  BufferedMessage,
} from '../../../domains/ingestion/message-buffer.port';

import { bufferedMessages } from '../schema/buffered-messages';

@Injectable()
export class PostgresMessageBuffer implements MessageBufferPort {
  constructor(@Inject(DB) private readonly db: NodePgDatabase) {}

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
      .onConflictDoNothing({
        target: [bufferedMessages.chatId, bufferedMessages.messageId],
      });
  }

  async getBatch(chatId: string, limit = 200): Promise<BufferedMessage[]> {
    const rows = await this.db
      .select({
        bufferId: bufferedMessages.id,
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

  async clear(chatId: string): Promise<void> {
    await this.db
      .delete(bufferedMessages)
      .where(eq(bufferedMessages.chatId, chatId));
  }

  async clearUpTo(chatId: string, maxBufferId: number): Promise<void> {
    await this.db
      .delete(bufferedMessages)
      .where(
        and(
          eq(bufferedMessages.chatId, chatId),
          lte(bufferedMessages.id, maxBufferId),
        ),
      );
  }

  async count(chatId: string): Promise<number> {
    const rows = await this.db
      .select({ c: sql<number>`count(*)` })
      .from(bufferedMessages)
      .where(eq(bufferedMessages.chatId, chatId));

    return Number(rows[0]?.c ?? 0);
  }

  async getForPeriod(params: {
    chatId: string;
    fromTsMs: number;
    toTsMs: number;
    maxChars: number;
  }): Promise<BufferedMessage[]> {
    const { chatId, fromTsMs, toTsMs, maxChars } = params;

    // Берём с запасом (потом обрежем по символам)
    const rows = await this.db
      .select()
      .from(bufferedMessages)
      .where(
        and(
          eq(bufferedMessages.chatId, chatId),
          gte(bufferedMessages.tsMs, fromTsMs),
          lte(bufferedMessages.tsMs, toTsMs),
        ),
      )
      .orderBy(desc(bufferedMessages.tsMs))
      .limit(2000);

    // Обрезаем по maxChars, сохраняя “свежие” сообщения
    let used = 0;
    const picked: any[] = [];
    for (const r of rows) {
      const t = String(r.text ?? '');
      if (!t) continue;

      if (used + t.length > maxChars) break;
      used += t.length;

      picked.push({
        bufferId: r.id,
        chatId: r.chatId,
        userId: r.userId ?? null,
        messageId: r.messageId,
        text: t,
        ts: Number(r.tsMs),
      });
    }

    // Вернём по возрастанию времени (чтобы LLM видел “как разговор”)
    picked.sort((a, b) => a.ts - b.ts);
    return picked;
  }

  async getLastByChars(params: {
    chatId: string;
    maxChars: number;
    maxRows?: number;
  }) {
    const { chatId, maxChars, maxRows = 2000 } = params;

    const rows = await this.db
      .select()
      .from(bufferedMessages)
      .where(eq(bufferedMessages.chatId, chatId))
      .orderBy(desc(bufferedMessages.tsMs))
      .limit(maxRows);

    let used = 0;
    const picked: any[] = [];

    for (const r of rows) {
      const t = String(r.text ?? '');
      if (!t) continue;

      if (used + t.length > maxChars) break;
      used += t.length;

      picked.push({
        bufferId: r.id,
        chatId: r.chatId,
        userId: r.userId ?? null,
        messageId: r.messageId,
        text: t,
        ts: Number(r.tsMs),
      });
    }

    picked.sort((a, b) => a.ts - b.ts);
    return picked;
  }
}
