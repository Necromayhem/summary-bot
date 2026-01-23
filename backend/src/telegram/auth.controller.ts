import { Body, Controller, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TelegramAuthService } from './telegram-auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly telegramAuth: TelegramAuthService,
    private readonly jwt: JwtService,
  ) {}

  @Post('telegram')
  async authTelegram(@Body() body: { initData: string }) {
    const result = this.telegramAuth.verify(body.initData);
    const tgUser = result.telegramUser;

    const payload = {
      sub: String(tgUser.id),
      username: tgUser.username ?? null,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      expiresIn: 7 * 24 * 60 * 60,
      user: {
        id: String(tgUser.id),
        username: tgUser.username ?? null,
      },
    };
  }
}
