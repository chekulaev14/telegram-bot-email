# 🚀 Установка на Netlify

## Шаг 1: Деплой на Netlify

1. Залогинься на [netlify.com](https://netlify.com)
2. Нажми **"Add new site"** → **"Import an existing project"**
3. Выбери **GitHub** → найди репозиторий `telegram-bot-email`
4. Настройки деплоя:
   - **Build command:** оставь пустым
   - **Publish directory:** оставь пустым
5. Нажми **"Deploy"**

---

## Шаг 2: Добавь переменные окружения

В Netlify:
1. Зайди в **Site settings** → **Environment variables**
2. Добавь переменные:

```
TELEGRAM_BOT_TOKEN = 8014519978:AAHQi9o6p_2mc02KA40j3Q3X1yxb7WI--jA
EMAIL_FROM = kontekst-rt@yandex.ru
EMAIL_PASSWORD = 7e7d79ae28800cff04ee0722d1f31401
EMAIL_TO = kontekst-rt@yandex.ru
SMTP_SERVER = smtp.yandex.ru
SMTP_PORT = 587
```

3. Нажми **"Save"**
4. Сделай **Redeploy** сайта

---

## Шаг 3: Узнай URL функции

После деплоя твоя Netlify Function будет доступна по адресу:
```
https://ИМЯ-САЙТА.netlify.app/.netlify/functions/telegram-webhook
```

Например:
```
https://telegram-bot-email.netlify.app/.netlify/functions/telegram-webhook
```

Скопируй этот URL!

---

## Шаг 4: Установи вебхук Telegram

### Вариант А: Через браузер
Открой в браузере (замени `YOUR_BOT_TOKEN` и `YOUR_URL`):
```
https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_URL
```

Пример:
```
https://api.telegram.org/bot8014519978:AAHQi9o6p_2mc02KA40j3Q3X1yxb7WI--jA/setWebhook?url=https://telegram-bot-email.netlify.app/.netlify/functions/telegram-webhook
```

Должно вернуть:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Вариант Б: Через скрипт (локально)
1. Добавь в `.env`:
```
WEBHOOK_URL=https://ИМЯ-САЙТА.netlify.app/.netlify/functions/telegram-webhook
```

2. Запусти:
```bash
npm run setup-webhook
```

---

## Шаг 5: Проверка

1. Открой Telegram
2. Найди своего бота
3. Отправь `/start`
4. Отправь файл
5. Проверь email!

---

## Проверка вебхука

Открой в браузере:
```
https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo
```

Должно показать информацию о вебхуке.

---

## Логи

Смотри логи в Netlify:
**Functions** → **telegram-webhook** → **Function log**

---

## Troubleshooting

**Бот не отвечает:**
- Проверь что вебхук установлен (getWebhookInfo)
- Проверь логи в Netlify
- Проверь что все переменные окружения добавлены

**Файлы не приходят на email:**
- Проверь правильность SMTP настроек
- Проверь логи функции в Netlify
- Проверь что пароль приложения правильный

---

✅ Готово! Бот работает на Netlify!
