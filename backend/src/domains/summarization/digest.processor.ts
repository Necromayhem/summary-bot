import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

import { DIGEST_JOB, DIGEST_QUEUE, DigestJobPayload } from './digest.queue';
import { SummarizationService } from './summarization.service';

@Processor(DIGEST_QUEUE, { concurrency: 5 })
export class DigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DigestProcessor.name);

  constructor(
    private readonly summarization: SummarizationService,
    @InjectBot() private readonly bot: Telegraf,
  ) {
    super();
  }

  async process(job: Job<DigestJobPayload>) {
    if (job.name !== DIGEST_JOB) return;

    const { chatId, mode, requestedByUserId } = job.data;

    try {
      const result = await this.summarization.runDigest({
        chatId,
        mode,
      });

      await this.bot.telegram.sendMessage(requestedByUserId, result, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });

      return { ok: true };
    } catch (e: any) {
      const msg = String(e?.message ?? e);

      this.logger.error(
        `digest failed chatId=${chatId} periodHours=${mode} user=${requestedByUserId} err=${msg}`,
        e?.stack,
      );

      await this.bot.telegram.sendMessage(
        requestedByUserId,
        `Не получилось сделать дайджест 😕\nОшибка: ${msg}`,
      );

      throw e;
    }
  }
}
