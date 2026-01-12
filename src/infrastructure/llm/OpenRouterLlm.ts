import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import type { LlmPort } from 'src/domains/summarization/llm.port';
import type { BufferedMessage } from 'src/domains/ingestion/message-buffer.port';

@Injectable()
export class OpenRouterLlm implements LlmPort {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly logger = new Logger(OpenRouterLlm.name);

  constructor() {
    // OpenRouter exposes an OpenAI-compatible API.
    // Base URL: https://openrouter.ai/api/v1
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenRouter API key not found. Set OPENROUTER_API_KEY (preferred).',
      );
    }

    const baseURL =
      process.env.OPENROUTER_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      'https://openrouter.ai/api/v1';

    // Optional but recommended by OpenRouter.
    const referer = process.env.OPENROUTER_HTTP_REFERER;
    const title = process.env.OPENROUTER_X_TITLE;

    this.client = new OpenAI({
      apiKey,
      baseURL,
      timeout: 30_000,
      maxRetries: 2,
      defaultHeaders: {
        ...(referer ? { 'HTTP-Referer': referer } : {}),
        ...(title ? { 'X-Title': title } : {}),
      },
    });

    // OpenRouter model naming is usually "provider/model"
    this.model =
      process.env.OPENROUTER_MODEL ||
      process.env.OPENAI_MODEL ||
      'mistralai/mistral-7b-instruct';
  }

  async summarize(
    chatId: string,
    messages: BufferedMessage[],
  ): Promise<string> {
    const startedAt = Date.now();

    const lines = messages
      .map((m) => {
        const dt = new Date(m.ts).toISOString();
        const text = (m.text ?? '').replace(/\s+/g, ' ').trim();
        if (!text) return null;
        const user = m.userId ? `user=${m.userId}` : 'user=unknown';
        return `${dt} (${user}) — ${text}`;
      })
      .filter(Boolean)
      .join('\n');

    if (!lines.trim()) {
      this.logger.warn(`summarize: empty input chatId=${chatId}`);
      return 'Недостаточно данных для суммаризации.';
    }

    this.logger.log(
      `summarize:start chatId=${chatId} msgs=${messages.length} model=${this.model}`,
    );

    try {
      const system =
        'Ты — помощник для суммаризации диалогов. ' +
        'Сделай краткую суммаризацию диалога на русском языке. ' +
        'Формат: 5–10 буллетов и одна строка "Итог". ' +
        'Не выдумывай факты и не добавляй ничего от себя.';

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `chatId=${chatId}\n\nСообщения:\n${lines}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.2,
      });

      const out = (response.choices?.[0]?.message?.content ?? '').trim();
      this.logger.log(
        `summarize:done chatId=${chatId} ms=${Date.now() - startedAt} outLen=${out.length}`,
      );

      return out || 'Суммаризация не удалась.';
    } catch (e: any) {
      this.logger.error(
        `summarize:error chatId=${chatId} ms=${Date.now() - startedAt} msg=${String(
          e?.message ?? e,
        )}`,
        e?.stack,
      );
      throw e;
    }
  }
}
