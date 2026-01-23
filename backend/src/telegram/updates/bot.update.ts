import { Start, Update, On, Ctx, Command } from 'nestjs-telegraf';
import { IngestionService } from 'src/domains/ingestion/ingestion.service';
import { Logger } from '@nestjs/common';
import { TelegramChatsService } from '../telegram-chats.service';

const logger = new Logger('bot update');

@Update()
export class BotUpdate {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly telegramChats: TelegramChatsService,
  ) {}

  async onStart(@Ctx() ctx) {
    const baseUrl = process.env.TG_MINIAPP_URL;
    if (!baseUrl) return ctx.reply('TG_MINIAPP_URL не задан в .env');

    const cleanBase = String(baseUrl).replace(/\/+$/, '');
    const openUrl = `${cleanBase}?source=start`;

    const botUsername = (
      ctx.botInfo?.username ||
      process.env.BOT_USERNAME ||
      ''
    )
      .replace(/^@/, '')
      .trim();
    const addToGroupUrl = botUsername
      ? `https://t.me/${botUsername}?startgroup=true`
      : undefined;

    const isPrivate = ctx.chat?.type === 'private';

    const keyboard = {
      inline_keyboard: [
        [
          isPrivate
            ? { text: '📁 Мои группы', web_app: { url: openUrl } }
            : {
                text: '📁 Открыть Mini App',
                url: `https://t.me/${botUsername}`,
              }, // или openUrl как обычный url
        ],
        ...(addToGroupUrl
          ? [[{ text: '➕ Добавить бота в групповой чат', url: addToGroupUrl }]]
          : []),
      ],
    };

    await ctx.reply('...', { reply_markup: keyboard, parse_mode: 'HTML' });
  }

  @Command('app')
  async openApp(@Ctx() ctx) {
    const baseUrl = process.env.TG_MINIAPP_URL;
    if (!baseUrl) return ctx.reply('TG_MINIAPP_URL не задан в .env');

    const chatId = ctx.chat?.id;
    if (!chatId) return ctx.reply('Не удалось определить chatId');

    const cleanBase = String(baseUrl).replace(/\/+$/, '');
    const url = `${cleanBase}?source=chat&chatId=${encodeURIComponent(String(chatId))}`;

    await ctx.reply('Открыть интерфейс:', {
      reply_markup: {
        inline_keyboard: [[{ text: '📊 Открыть Summary', web_app: { url } }]],
      },
    });
  }

  @On('my_chat_member')
  async onMyChatMember(@Ctx() ctx) {
    const upd = (ctx.update as any)?.my_chat_member;
    if (!upd) return;

    const chat = upd.chat;
    const newStatus: string | undefined = upd?.new_chat_member?.status;

    if (newStatus === 'member' || newStatus === 'administrator') {
      await this.telegramChats.upsertChat({
        chatId: String(chat.id),
        type: chat.type ?? 'unknown',
        title: chat.title ?? null,
      });
      logger.log(`chat registered: ${chat.id} status=${newStatus}`);
    }

    if (newStatus === 'left' || newStatus === 'kicked') {
      await this.telegramChats.markInactive(String(chat.id));
      logger.log(`chat deactivated: ${chat.id} status=${newStatus}`);
    }
  }

  @On('new_chat_members')
  async onNewMembers(@Ctx() ctx) {
    const members = (ctx.message as any)?.new_chat_members ?? [];
    const myBotId = ctx.botInfo?.id;

    const addedMe = myBotId
      ? members.some((m) => m.id === myBotId)
      : members.some((m) => m.is_bot);

    if (!addedMe) return;

    const chat = ctx.chat;
    await this.telegramChats.upsertChat({
      chatId: String(chat.id),
      type: (chat as any)?.type ?? 'unknown',
      title: (chat as any)?.title ?? null,
    });

    logger.log('Бота добавили в группу: ' + chat.id);
    await ctx.reply('Привет, я в группе 👋');
  }

  @On('message')
  async onAnyMessage(@Ctx() ctx) {
    const msg = ctx.message as any;
    if (!msg) return;

    const chatId = String(msg.chat.id);

    // touch чтобы чат был “живой”
    await this.telegramChats.touch(chatId);

    const text: string | undefined =
      typeof msg.text === 'string' ? msg.text : undefined;
    if (!text || text.trim().length === 0) return;

    await this.ingestionService.ingestTelegramMessage({
      chatId,
      userId: msg.from?.id ? String(msg.from.id) : null,
      text,
      messageId: String(msg.message_id),
      ts: msg.date ? msg.date * 1000 : Date.now(),
    });
  }

  @On('left_chat_member')
  async onLeftMember(@Ctx() ctx) {
    const msg = ctx.message as any;
    const left = msg?.left_chat_member;
    const myBotId = ctx.botInfo?.id;

    if (!left || !myBotId) return;

    if (left.id === myBotId) {
      await this.telegramChats.markInactive(String(msg.chat.id));
      logger.log(`chat deactivated via left_chat_member: ${msg.chat.id}`);
    }
  }
}
