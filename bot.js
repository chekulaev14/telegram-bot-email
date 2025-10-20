require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Получение переменных окружения
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_TO = process.env.EMAIL_TO;
const SMTP_SERVER = process.env.SMTP_SERVER || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;

// Проверка наличия всех необходимых переменных
if (!TELEGRAM_BOT_TOKEN || !EMAIL_FROM || !EMAIL_PASSWORD || !EMAIL_TO) {
    console.error('❌ Не все переменные окружения настроены! Проверь .env файл');
    process.exit(1);
}

// Создание транспортера для отправки email
const transporter = nodemailer.createTransport({
    host: SMTP_SERVER,
    port: SMTP_PORT,
    secure: false, // true для 465, false для других портов
    auth: {
        user: EMAIL_FROM,
        pass: EMAIL_PASSWORD
    }
});

// Создание бота
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log('🤖 Telegram бот запущен...');

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "👋 Привет! Я бот для пересылки файлов на email.\n\n" +
        "📎 Отправь мне файл (PDF, PNG, JPEG), и я перешлю его на почту.\n\n" +
        "Поддерживаемые форматы:\n" +
        "• PDF документы\n" +
        "• Изображения (PNG, JPEG, JPG)"
    );
});

// Обработчик команды /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
        "ℹ️ Инструкция:\n\n" +
        "1. Отправь мне файл (PDF, PNG, JPEG)\n" +
        "2. Я автоматически перешлю его на email\n" +
        "3. Получишь уведомление об успехе\n\n" +
        "Команды:\n" +
        "/start - Начало работы\n" +
        "/help - Эта справка"
    );
});

// Функция отправки email
async function sendEmail(filePath, fileName, userInfo) {
    try {
        const mailOptions = {
            from: EMAIL_FROM,
            to: EMAIL_TO,
            subject: `📎 Файл из Telegram: ${fileName}`,
            text: `Новый файл получен от Telegram бота.\n\nФайл: ${fileName}\nОт пользователя: ${userInfo}\n\n---\nОтправлено автоматически Telegram ботом`,
            attachments: [
                {
                    filename: fileName,
                    path: filePath
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email отправлен успешно: ${fileName}`);
        return true;
    } catch (error) {
        console.error(`❌ Ошибка отправки email: ${error.message}`);
        return false;
    }
}

// Обработчик документов
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const document = msg.document;
    const fileName = document.file_name;

    // Проверка типа файла
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileExt = path.extname(fileName).toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
        bot.sendMessage(chatId,
            "❌ Неподдерживаемый формат файла.\n" +
            "Поддерживаются: PDF, PNG, JPEG"
        );
        return;
    }

    // Уведомление о начале обработки
    const statusMsg = await bot.sendMessage(chatId, "⏳ Получаю файл...");

    try {
        // Создание временной директории если её нет
        const tmpDir = path.join(__dirname, 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        // Скачивание файла
        const filePath = path.join(tmpDir, fileName);
        await bot.downloadFile(document.file_id, tmpDir);

        // Обновление статуса
        await bot.editMessageText("📧 Отправляю на email...", {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });

        // Информация о пользователе
        const user = msg.from;
        const userInfo = `${user.first_name || ''} ${user.last_name || ''} (@${user.username || 'без username'})`.trim();

        // Отправка на email
        const success = await sendEmail(filePath, fileName, userInfo);

        if (success) {
            await bot.editMessageText(
                `✅ Файл '${fileName}' успешно отправлен на ${EMAIL_TO}`,
                {
                    chat_id: chatId,
                    message_id: statusMsg.message_id
                }
            );
        } else {
            await bot.editMessageText(
                "❌ Ошибка при отправке на email. Попробуй еще раз.",
                {
                    chat_id: chatId,
                    message_id: statusMsg.message_id
                }
            );
        }

        // Удаление временного файла
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(`❌ Ошибка обработки файла: ${error.message}`);
        await bot.editMessageText(
            "❌ Произошла ошибка при обработке файла.",
            {
                chat_id: chatId,
                message_id: statusMsg.message_id
            }
        );
    }
});

// Обработчик фотографий
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;
    const photo = msg.photo[msg.photo.length - 1]; // Берем фото в лучшем качестве

    // Уведомление о начале обработки
    const statusMsg = await bot.sendMessage(chatId, "⏳ Получаю фото...");

    try {
        // Создание временной директории если её нет
        const tmpDir = path.join(__dirname, 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        // Скачивание файла
        const fileName = `photo_${photo.file_unique_id}.jpg`;
        const filePath = path.join(tmpDir, fileName);
        await bot.downloadFile(photo.file_id, tmpDir);

        // Переименование файла (bot.downloadFile сохраняет с file_id)
        const downloadedPath = path.join(tmpDir, photo.file_id);
        if (fs.existsSync(downloadedPath)) {
            fs.renameSync(downloadedPath, filePath);
        }

        // Обновление статуса
        await bot.editMessageText("📧 Отправляю на email...", {
            chat_id: chatId,
            message_id: statusMsg.message_id
        });

        // Информация о пользователе
        const user = msg.from;
        const userInfo = `${user.first_name || ''} ${user.last_name || ''} (@${user.username || 'без username'})`.trim();

        // Отправка на email
        const success = await sendEmail(filePath, fileName, userInfo);

        if (success) {
            await bot.editMessageText(
                `✅ Фото успешно отправлено на ${EMAIL_TO}`,
                {
                    chat_id: chatId,
                    message_id: statusMsg.message_id
                }
            );
        } else {
            await bot.editMessageText(
                "❌ Ошибка при отправке на email. Попробуй еще раз.",
                {
                    chat_id: chatId,
                    message_id: statusMsg.message_id
                }
            );
        }

        // Удаление временного файла
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(`❌ Ошибка обработки фото: ${error.message}`);
        await bot.editMessageText(
            "❌ Произошла ошибка при обработке фото.",
            {
                chat_id: chatId,
                message_id: statusMsg.message_id
            }
        );
    }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error(`❌ Ошибка polling: ${error.message}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Остановка бота...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Остановка бота...');
    bot.stopPolling();
    process.exit(0);
});
