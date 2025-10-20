const axios = require('axios');
const nodemailer = require('nodemailer');

// Получение переменных окружения
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_TO = process.env.EMAIL_TO;
const SMTP_SERVER = process.env.SMTP_SERVER || 'smtp.yandex.ru';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Создание транспортера для отправки email
const transporter = nodemailer.createTransport({
    host: SMTP_SERVER,
    port: SMTP_PORT,
    secure: false,
    auth: {
        user: EMAIL_FROM,
        pass: EMAIL_PASSWORD
    }
});

// Функция отправки сообщения в Telegram
async function sendMessage(chatId, text, keyboard = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text
        };

        if (keyboard) {
            payload.reply_markup = keyboard;
        }

        await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error.message);
    }
}

// Функция редактирования сообщения
async function editMessage(chatId, messageId, text) {
    try {
        await axios.post(`${TELEGRAM_API}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: text
        });
    } catch (error) {
        console.error('Ошибка редактирования сообщения:', error.message);
    }
}

// Функция скачивания файла
async function downloadFile(fileId) {
    try {
        // Получаем информацию о файле
        const fileInfoResponse = await axios.get(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
        const filePath = fileInfoResponse.data.result.file_path;

        // Скачиваем файл
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
        const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });

        return {
            buffer: fileResponse.data,
            path: filePath
        };
    } catch (error) {
        console.error('Ошибка скачивания файла:', error.message);
        throw error;
    }
}

// Функция отправки email
async function sendEmail(fileBuffer, fileName, userInfo) {
    try {
        const mailOptions = {
            from: EMAIL_FROM,
            to: EMAIL_TO,
            subject: `📎 Файл из Telegram: ${fileName}`,
            text: `Новый файл получен от Telegram бота.\n\nФайл: ${fileName}\nОт пользователя: ${userInfo}\n\n---\nОтправлено автоматически Telegram ботом`,
            attachments: [
                {
                    filename: fileName,
                    content: fileBuffer
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

// Главный обработчик
exports.handler = async (event) => {
    // Проверка метода запроса
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 200,
            body: 'OK'
        };
    }

    try {
        const update = JSON.parse(event.body);
        console.log('Получено обновление:', JSON.stringify(update));

        // Обработка команды /start или текста "Старт"
        if (update.message && (update.message.text === '/start' || update.message.text === 'Старт')) {
            const chatId = update.message.chat.id;

            // Клавиатура с кнопкой "Старт"
            const keyboard = {
                keyboard: [
                    [{ text: '📎 Отправить файл' }],
                    [{ text: 'ℹ️ Помощь' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            };

            await sendMessage(chatId,
                "👋 Привет! Я бот для пересылки файлов на email.\n\n" +
                "📎 Просто отправь мне файл (PDF, PNG, JPEG), и я перешлю его на почту.\n\n" +
                "Поддерживаемые форматы:\n" +
                "• PDF документы\n" +
                "• Изображения (PNG, JPEG, JPG)",
                keyboard
            );
        }

        // Обработка команды /help или кнопки "Помощь"
        if (update.message && (update.message.text === '/help' || update.message.text === 'ℹ️ Помощь')) {
            const chatId = update.message.chat.id;
            await sendMessage(chatId,
                "ℹ️ Инструкция:\n\n" +
                "1. Просто отправь мне файл (PDF, PNG, JPEG)\n" +
                "2. Я автоматически перешлю его на email\n" +
                "3. Получишь уведомление об успехе\n\n" +
                "Всё очень просто - нажми 📎 на скрепку снизу и выбери файл!"
            );
        }

        // Обработка кнопки "Отправить файл"
        if (update.message && update.message.text === '📎 Отправить файл') {
            const chatId = update.message.chat.id;
            await sendMessage(chatId,
                "📎 Отлично!\n\n" +
                "Нажми на скрепку 📎 внизу экрана и выбери файл который хочешь отправить.\n\n" +
                "Я приму PDF документы и изображения (PNG, JPEG)."
            );
        }

        // Обработка документа
        if (update.message && update.message.document) {
            const chatId = update.message.chat.id;
            const document = update.message.document;
            const fileName = document.file_name;

            // Проверка типа файла
            const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
            const fileExt = fileName.toLowerCase().match(/\.[^.]+$/);

            if (!fileExt || !allowedExtensions.includes(fileExt[0])) {
                await sendMessage(chatId,
                    "❌ Неподдерживаемый формат файла.\n" +
                    "Поддерживаются: PDF, PNG, JPEG"
                );
                return { statusCode: 200, body: 'OK' };
            }

            // Отправка статуса
            const statusResponse = await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: "⏳ Получаю файл..."
            });
            const statusMessageId = statusResponse.data.result.message_id;

            try {
                // Скачивание файла
                const fileData = await downloadFile(document.file_id);

                // Обновление статуса
                await editMessage(chatId, statusMessageId, "📧 Отправляю на email...");

                // Информация о пользователе
                const user = update.message.from;
                const userInfo = `${user.first_name || ''} ${user.last_name || ''} (@${user.username || 'без username'})`.trim();

                // Отправка на email
                const success = await sendEmail(fileData.buffer, fileName, userInfo);

                if (success) {
                    await editMessage(chatId, statusMessageId,
                        `✅ Файл '${fileName}' успешно отправлен на ${EMAIL_TO}`
                    );
                } else {
                    await editMessage(chatId, statusMessageId,
                        "❌ Ошибка при отправке на email. Попробуй еще раз."
                    );
                }
            } catch (error) {
                console.error('Ошибка обработки документа:', error);
                await editMessage(chatId, statusMessageId,
                    "❌ Произошла ошибка при обработке файла."
                );
            }
        }

        // Обработка фото
        if (update.message && update.message.photo) {
            const chatId = update.message.chat.id;
            const photo = update.message.photo[update.message.photo.length - 1];

            // Отправка статуса
            const statusResponse = await axios.post(`${TELEGRAM_API}/sendMessage`, {
                chat_id: chatId,
                text: "⏳ Получаю фото..."
            });
            const statusMessageId = statusResponse.data.result.message_id;

            try {
                // Скачивание файла
                const fileData = await downloadFile(photo.file_id);
                const fileName = `photo_${photo.file_unique_id}.jpg`;

                // Обновление статуса
                await editMessage(chatId, statusMessageId, "📧 Отправляю на email...");

                // Информация о пользователе
                const user = update.message.from;
                const userInfo = `${user.first_name || ''} ${user.last_name || ''} (@${user.username || 'без username'})`.trim();

                // Отправка на email
                const success = await sendEmail(fileData.buffer, fileName, userInfo);

                if (success) {
                    await editMessage(chatId, statusMessageId,
                        `✅ Фото успешно отправлено на ${EMAIL_TO}`
                    );
                } else {
                    await editMessage(chatId, statusMessageId,
                        "❌ Ошибка при отправке на email. Попробуй еще раз."
                    );
                }
            } catch (error) {
                console.error('Ошибка обработки фото:', error);
                await editMessage(chatId, statusMessageId,
                    "❌ Произошла ошибка при обработке фото."
                );
            }
        }

        return {
            statusCode: 200,
            body: 'OK'
        };
    } catch (error) {
        console.error('Ошибка обработки запроса:', error);
        return {
            statusCode: 200,
            body: 'OK'
        };
    }
};
