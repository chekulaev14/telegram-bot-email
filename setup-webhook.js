// Скрипт для установки вебхука Telegram
require('dotenv').config();
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // Например: https://your-site.netlify.app/.netlify/functions/telegram-webhook

async function setWebhook() {
    try {
        if (!TELEGRAM_BOT_TOKEN) {
            console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env');
            process.exit(1);
        }

        if (!WEBHOOK_URL) {
            console.error('❌ WEBHOOK_URL не установлен в .env');
            console.log('Добавь в .env:');
            console.log('WEBHOOK_URL=https://your-site.netlify.app/.netlify/functions/telegram-webhook');
            process.exit(1);
        }

        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
            {
                url: WEBHOOK_URL
            }
        );

        if (response.data.ok) {
            console.log('✅ Вебхук успешно установлен!');
            console.log(`URL: ${WEBHOOK_URL}`);

            // Проверка вебхука
            const info = await axios.get(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
            );
            console.log('\nИнформация о вебхуке:');
            console.log(JSON.stringify(info.data.result, null, 2));
        } else {
            console.error('❌ Ошибка установки вебхука:', response.data);
        }
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

setWebhook();
