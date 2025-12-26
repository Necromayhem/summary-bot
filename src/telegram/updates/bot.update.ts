import { Start, Update, On, Ctx } from 'nestjs-telegraf';

@Update()
export class BotUpdate {
  @Start()
  firstStart(@Ctx() ctx) {
    ctx.reply('Привет! Чтобы увидеть все команды напишите "меню"');
  }

  @On('text')
  async showMenu(@Ctx() ctx) {
    const text = ctx.message?.text?.trim().toLowerCase();
    if (text === 'меню') {
      ctx.reply('Выбери пункт:', {
        reply_markup: {
          keyboard: [
            [{ text: 'Пункт 1' }],
            [{ text: 'Пункт 2' }],
            [{ text: 'Получить кота' }],
          ],
          resize_keyboard: true,
        },
      });
    } else if (text === 'пункт 1') {
      ctx.reply('Вы выбрали пункт 1');
    } else if (text === 'пункт 2') {
      ctx.reply('Вы выбрали пункт 2');
    } else if (text === 'получить кота' || text === 'кот') {
      const res = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await res.json();
      console.log(data);
      ctx.reply(data[0]?.url);
    }
  }
}
