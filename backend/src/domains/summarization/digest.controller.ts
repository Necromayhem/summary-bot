import { Body, Controller, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SummarizationService } from './summarization.service';
import type { DigestMode } from './digest.queue';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Controller('digest')
@UseGuards(JwtAuthGuard)
export class DigestController {
  constructor(
    private readonly summarization: SummarizationService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  @Post()
  async createDigest(
    @Req() req: any,
    @Body()
    body: {
      chatId: string;
      mode: DigestMode;
    },
  ) {
    const userId = req.user.userId;

    // 🔐 проверка, что пользователь реально состоит в чате
    try {
      const member = await this.bot.telegram.getChatMember(body.chatId, userId);
      if (['left', 'kicked'].includes(member.status)) {
        throw new Error('not member');
      }
    } catch {
      throw new ForbiddenException('You are not a member of this chat');
    }

    await this.summarization.enqueueDigest({
      chatId: String(body.chatId),
      mode: body.mode,
      requestedByUserId: userId,
    });

    return { ok: true };
  }
}

