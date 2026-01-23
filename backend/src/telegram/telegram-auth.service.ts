import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';

@Injectable()
export class TelegramAuthService {
  verify(initData: string): {
    telegramUser: {
      id: number;
      username?: string;
    };
  } {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new Error('No hash');

    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secret = createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN!)
      .digest();

    const calculatedHash = createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      throw new Error('Invalid Telegram signature');
    }

    const user = JSON.parse(params.get('user')!);
    return { telegramUser: user };
  }
}
