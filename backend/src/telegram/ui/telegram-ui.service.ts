import { Injectable } from '@nestjs/common';

type DigestMode = '12h' | '24h' | 'last10k';

@Injectable()
export class TelegramUiService {
  buildStartText(): string {
    return [
      `Привет! 👋`,
      ``,
      `Я — Telegram-бот для создания саммари сообщений в групповых чатах с помощью ИИ.`,
      ``,
      `<b>Что я умею сейчас:</b>`,
      `📝 Делаю короткие и понятные дайджесты обсуждений`,
      `⏱ За последние 12 часов`,
      `📆 За последние 24 часа`,
      `📚 По последним 10 000 символам сообщений`,
      ``,
      `Я выделяю основные темы и ключевые события, чтобы ты быстро понял(а), что происходило в чате.`,
      ``,
      `ℹ️ Дайджест создаётся по запросу и приходит в личные сообщения.`,
      ``,
      `Ниже выбери нужный режим 👇`,
      ``,
      `———`,
      ``,
      `Hi! 👋`,
      ``,
      `I’m a Telegram bot that creates AI-powered summaries of group chat messages.`,
      ``,
      `<b>What I can do right now:</b>`,
      `📝 Create clear and concise chat digests`,
      `⏱ Last 12 hours`,
      `📆 Last 24 hours`,
      `📚 Last 10,000 characters`,
      ``,
      `ℹ️ The summary is generated on demand and sent to your private messages.`,
    ].join('\n');
  }

  /**
   * 3 кнопки суммаризации :
   * - большие строки
   * - иконки
   * - без лишнего текста
   */
  buildStartKeyboard(miniAppBaseUrl: string) {
    const url12h = this.buildMiniAppUrl(miniAppBaseUrl, '12h');
    const url24h = this.buildMiniAppUrl(miniAppBaseUrl, '24h');
    const urlLast10k = this.buildMiniAppUrl(miniAppBaseUrl, 'last10k');

    return {
      inline_keyboard: [
        [{ text: '🕒 Дайджест за 12 часов', web_app: { url: url12h } }],
        [{ text: '📆 Дайджест за 24 часа', web_app: { url: url24h } }],
        [
          {
            text: '📚 Последние 10 000 символов',
            web_app: { url: urlLast10k },
          },
        ],
      ],
    };
  }

  private buildMiniAppUrl(baseUrl: string, mode: DigestMode) {
    const cleanBase = String(baseUrl).replace(/\/+$/, '');
    // mode фронт прочитает и поставит нужный выбор по умолчанию
    // source — чтобы на фронте можно было отличать запуск со старта
    return `${cleanBase}?source=start&mode=${encodeURIComponent(mode)}`;
  }
}
