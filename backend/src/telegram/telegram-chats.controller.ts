import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DB } from 'src/database/database.module';
import { telegramChats } from 'src/database/schema';
import { desc, eq } from 'drizzle-orm';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Controller('telegram-chats')
export class TelegramChatsController {
  constructor(
    @Inject(DB) private readonly db: any,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  // (оставим как было, можно удалить позже)
  @Get()
  async list(@Query('active') active?: string) {
    const onlyActive = active === 'true';
    const q = this.db.select().from(telegramChats);

    const rows = onlyActive
      ? await q
          .where(eq(telegramChats.isActive, true))
          .orderBy(desc(telegramChats.lastSeenAt))
      : await q.orderBy(desc(telegramChats.lastSeenAt));

    return rows;
  }

  /**
   * ✅ Mini App: список чатов, где
   * - бот активен (is_active=true)
   * - пользователь состоит в чате (проверяем через getChatMember)
   */
  @UseGuards(JwtAuthGuard)
  @Get('my')
  async myChats(@Req() req: any, @Query('limit') limit?: string) {
    const userId = String(req.user?.userId ?? '');
    const max = Math.min(Math.max(Number(limit ?? 50), 1), 100);

    // 1) Берём только активные чаты (где бот есть)
    const rows = await this.db
      .select()
      .from(telegramChats)
      .where(eq(telegramChats.isActive, true))
      .orderBy(desc(telegramChats.lastSeenAt))
      .limit(max);

    // 2) Фильтруем те, где пользователь реально состоит
    const allowed: any[] = [];

    // небольшой concurrency=5 чтобы не спамить Telegram API
    const concurrency = 5;
    let i = 0;

    const worker = async () => {
      while (i < rows.length) {
        const idx = i++;
        const r = rows[idx];
        const chatId = String(r.chatId);

        try {
          const member = await this.bot.telegram.getChatMember(
            chatId,
            Number(userId),
          );
          if (member && !['left', 'kicked'].includes(member.status)) {
            allowed.push({
              chatId,
              title: r.title ?? null,
              type: r.type ?? null,
              lastSeenAt: r.lastSeenAt ?? null,
            });
          }
        } catch {
          // если бот не может проверить (нет прав/чат недоступен) — просто пропускаем
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    // Стабильный порядок (по lastSeenAt desc)
    allowed.sort((a, b) => {
      const aa = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bb - aa;
    });

    return allowed;
  }
}
