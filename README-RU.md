# Telegram бот для пересылки файлов на email

## Для чего?
Бот получает файлы (PDF, фото) в Telegram и автоматически пересылает их на указанный email.

## Как работает?
1. Отправляешь файл боту в Telegram
2. Бот скачивает файл
3. Бот отправляет файл на email через Yandex SMTP
4. Получаешь файл на почту

## Технологии
- **Node.js** - язык программирования
- **Netlify Functions** - бесплатный хостинг (serverless)
- **Telegram Bot API** - вебхуки для получения сообщений
- **Nodemailer** - отправка email через Yandex SMTP

## Где находится
- **Код:** https://github.com/chekulaev14/telegram-bot-email
- **Хостинг:** https://tg-bot-ta.netlify.app
- **Бот в Telegram:** найди по токену или username

## Настройки (переменные окружения)
В Netlify настроены переменные:
- `TELEGRAM_BOT_TOKEN` - токен бота от @BotFather
- `EMAIL_FROM` - kontekst-rt@yandex.ru
- `EMAIL_PASSWORD` - пароль приложения Yandex
- `EMAIL_TO` - kontekst-rt@yandex.ru (куда отправлять)
- `SMTP_SERVER` - smtp.yandex.ru
- `SMTP_PORT` - 587

## Как изменить настройки?
1. Зайди на [Netlify](https://app.netlify.com)
2. **Site settings** → **Environment variables**
3. Измени нужную переменную
4. **Redeploy site**

## Как посмотреть логи (если что-то не работает)?
1. Зайди на [Netlify](https://app.netlify.com)
2. **Functions** → **telegram-webhook** → **Function log**
3. Там видны все ошибки

## Файлы проекта
```
telegram-bot-email/
├── netlify/
│   └── functions/
│       └── telegram-webhook.js   # Основной код бота
├── package.json                  # Зависимости Node.js
├── netlify.toml                  # Настройки Netlify
├── .env.example                  # Пример переменных окружения
├── .gitignore                    # Что не коммитить в Git
└── README-RU.md                  # Этот файл
```

## Поддерживаемые форматы файлов
- PDF документы (*.pdf)
- Изображения (*.png, *.jpg, *.jpeg)

## Ограничения
- Размер файла: до ~20 МБ (лимит Telegram Bot API)
- Бесплатный Netlify: 125,000 запросов в месяц

## Как работает технически?
1. **Telegram** отправляет вебхук на `https://tg-bot-ta.netlify.app/.netlify/functions/telegram-webhook`
2. **Netlify Function** получает обновление (файл от пользователя)
3. Функция **скачивает файл** с серверов Telegram
4. Функция **отправляет email** через Yandex SMTP с файлом в приложении
5. Пользователь получает **подтверждение** в Telegram

## Команды бота
- `/start` или кнопка **"Старт"** - начало работы, показывает меню
- Кнопка **"📎 Отправить файл"** - инструкция как отправить
- Кнопка **"ℹ️ Помощь"** - справка

## Если бот не работает
1. Проверь логи в Netlify (Functions → telegram-webhook → Function log)
2. Проверь что переменные окружения правильные
3. Проверь что вебхук установлен: открой в браузере
   ```
   https://api.telegram.org/bot{TOKEN}/getWebhookInfo
   ```
   Должно показать URL: `https://tg-bot-ta.netlify.app/.netlify/functions/telegram-webhook`

## Как переустановить вебхук?
Запусти в терминале:
```bash
curl -X POST "https://api.telegram.org/bot{ТВОЙ_ТОКЕН}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tg-bot-ta.netlify.app/.netlify/functions/telegram-webhook"}'
```

## Стоимость
**Бесплатно!** Netlify дает бесплатно 125k запросов/месяц для Functions.

## Автор
Создано с помощью Claude Code для автоматизации пересылки файлов.

---

**Дата создания:** 20 октября 2025
**Последнее обновление:** 20 октября 2025
