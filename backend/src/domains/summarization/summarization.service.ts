import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from 'src/database/database.module';

import type {
  MessageBufferPort,
  BufferedMessage,
} from 'src/domains/ingestion/message-buffer.port';
import { MESSAGE_BUFFER } from 'src/domains/ingestion/message-buffer.token';

import type { LlmPort } from './llm.port';
import { LLM } from './summarization.token';

import {
  DIGEST_QUEUE,
  DIGEST_JOB,
  DigestJobPayload,
  DigestMode,
} from './digest.queue';

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);

  constructor(
    @Inject(DB) private readonly db: NodePgDatabase,
    @Inject(MESSAGE_BUFFER) private readonly buffer: MessageBufferPort,
    @Inject(LLM) private readonly llm: LlmPort,
    @InjectQueue(DIGEST_QUEUE)
    private readonly digestQueue: Queue<DigestJobPayload>,
  ) {}

  async enqueueDigest(params: {
    chatId: string;
    mode: DigestMode;
    requestedByUserId: string;
  }) {
    await this.digestQueue.add(DIGEST_JOB, params, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 2,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.log(
      `digest enqueued chatId=${params.chatId} mode=${params.mode} user=${params.requestedByUserId}`,
    );

    return { ok: true };
  }

  async runDigest(params: {
    chatId: string;
    mode: DigestMode;
  }): Promise<string> {
    const { chatId, mode } = params;

    const now = Date.now();
    const maxChars = 10_000;

    let messages: BufferedMessage[] = [];
    let title = '';

    if (mode === '12h' || mode === '24h') {
      const periodHours = mode === '12h' ? 12 : 24;
      const fromTsMs = now - periodHours * 60 * 60 * 1000;

      messages = await this.buffer.getForPeriod({
        chatId,
        fromTsMs,
        toTsMs: now,
        maxChars,
      });

      title = `Дайджест за последние ${periodHours}ч`;
    } else {
      // ✅ last10k
      messages = await this.buffer.getLastByChars({
        chatId,
        maxChars,
        maxRows: 2000,
      });

      title = `Дайджест по последним 10\u00A0000 символам`;
    }

    if (messages.length === 0) return `Нет сообщений для дайджеста.`;

    const allText = messages.map((m) => m.text).join('\n');
    const urls = extractUrls(allText);

    const instruction = buildDigestInstruction(title, urls);

    const syntheticPromptMessage: BufferedMessage = {
      bufferId: 0,
      chatId,
      userId: null,
      messageId: 'prompt',
      text: instruction,
      ts: now,
    };

    const input = [syntheticPromptMessage, ...messages];

    this.logger.log(
      `digest llm:start chatId=${chatId} mode=${mode} msgs=${messages.length}`,
    );
    const summaryHtml = await this.llm.summarize(chatId, input);
    this.logger.log(
      `digest llm:done chatId=${chatId} outLen=${summaryHtml.length}`,
    );

    // сохраняем (если таблица есть)
    await this.db.execute(sql`
    INSERT INTO conversation_summaries (chat_id, from_ts_ms, to_ts_ms, summary, created_at)
    VALUES (${chatId}, ${now - 1}, ${now}, ${summaryHtml}, NOW());
  `);

    return summaryHtml;
  }

  // Оставим полезный API для UI: “последний summary”
  async getLatestSummary(chatId: string): Promise<{
    chatId: string;
    summary: string;
    createdAt: string;
    fromTsMs: number;
    toTsMs: number;
  } | null> {
    const res = await this.db.execute(sql<{
      chat_id: string;
      summary: string;
      created_at: string;
      from_ts_ms: number;
      to_ts_ms: number;
    }>`
      SELECT chat_id, summary, created_at, from_ts_ms, to_ts_ms
      FROM conversation_summaries
      WHERE chat_id = ${chatId}
      ORDER BY created_at DESC
      LIMIT 1;
    `);

    const row = res.rows?.[0];
    if (!row) return null;

    return {
      chatId: String(row.chat_id),
      summary: String(row.summary ?? ''),
      createdAt: row.created_at,
      fromTsMs: Number(row.from_ts_ms),
      toTsMs: Number(row.to_ts_ms),
    };
  }
}

// ===== helpers =====

function extractUrls(text: string): string[] {
  const re = /\bhttps?:\/\/[^\s<>()]+/gi;
  const found = text.match(re) ?? [];
  return Array.from(new Set(found)).slice(0, 50);
}

function buildDigestInstruction(title: string, urls: string[]) {
  const urlHint = urls.length
    ? `\n\nURL из чата (используй только их):\n${urls.map((u) => `- ${u}`).join('\n')}`
    : `\n\nВ сообщениях не найдено URL.`;

  return [
    `Ты делаешь: ${title}.`,
    `Ограничения: входной текст не больше 10k символов.`,
    `Сделай один связный summary-текст (без воды), максимум ~2000 слов.`,
    `В конце добавь блок: <b>Ключевые события и ссылки</b> (5–10 пунктов).`,
    `Если событие связано со ссылкой, вставь кликабельную HTML-ссылку: <a href="URL">короткое название</a>.`,
    `НЕ выдумывай ссылки. Используй только URL из списка ниже.`,
    `Формат ответа: HTML (Telegram parse_mode=HTML).`,
    urlHint,
    ``,
    `Ниже идут сообщения:`,
  ].join('\n');
}
