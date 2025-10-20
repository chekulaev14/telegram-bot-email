#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Получение переменных окружения
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
EMAIL_FROM = os.getenv('EMAIL_FROM')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
EMAIL_TO = os.getenv('EMAIL_TO')
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))

# Проверка наличия всех необходимых переменных
if not all([TELEGRAM_BOT_TOKEN, EMAIL_FROM, EMAIL_PASSWORD, EMAIL_TO]):
    raise ValueError("Не все переменные окружения настроены! Проверь .env файл")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Приветствие при команде /start"""
    await update.message.reply_text(
        "👋 Привет! Я бот для пересылки файлов на email.\n\n"
        "📎 Отправь мне файл (PDF, PNG, JPEG), и я перешлю его на почту.\n\n"
        "Поддерживаемые форматы:\n"
        "• PDF документы\n"
        "• Изображения (PNG, JPEG, JPG)"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Помощь при команде /help"""
    await update.message.reply_text(
        "ℹ️ Инструкция:\n\n"
        "1. Отправь мне файл (PDF, PNG, JPEG)\n"
        "2. Я автоматически перешлю его на email\n"
        "3. Получишь уведомление об успехе\n\n"
        "Команды:\n"
        "/start - Начало работы\n"
        "/help - Эта справка"
    )


def send_email(file_path, filename, user_info):
    """Отправка файла на email"""
    try:
        # Создание письма
        msg = MIMEMultipart()
        msg['From'] = EMAIL_FROM
        msg['To'] = EMAIL_TO
        msg['Subject'] = f'📎 Файл из Telegram: {filename}'

        # Тело письма
        body = f"""
        Новый файл получен от Telegram бота.

        Файл: {filename}
        От пользователя: {user_info}

        ---
        Отправлено автоматически Telegram ботом
        """
        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        # Прикрепление файла
        with open(file_path, 'rb') as attachment:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename= {filename}')
            msg.attach(part)

        # Отправка через SMTP
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_FROM, EMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()

        logger.info(f"Email отправлен успешно: {filename}")
        return True

    except Exception as e:
        logger.error(f"Ошибка отправки email: {str(e)}")
        return False


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка документов (PDF и т.д.)"""
    document = update.message.document
    file_name = document.file_name

    # Проверка типа файла
    allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg']
    if not any(file_name.lower().endswith(ext) for ext in allowed_extensions):
        await update.message.reply_text(
            "❌ Неподдерживаемый формат файла.\n"
            "Поддерживаются: PDF, PNG, JPEG"
        )
        return

    # Уведомление о начале обработки
    status_msg = await update.message.reply_text("⏳ Получаю файл...")

    try:
        # Скачивание файла
        file = await context.bot.get_file(document.file_id)
        file_path = f"/tmp/{file_name}"
        await file.download_to_drive(file_path)

        # Обновление статуса
        await status_msg.edit_text("📧 Отправляю на email...")

        # Информация о пользователе
        user = update.message.from_user
        user_info = f"{user.full_name} (@{user.username or 'без username'})"

        # Отправка на email
        if send_email(file_path, file_name, user_info):
            await status_msg.edit_text(
                f"✅ Файл '{file_name}' успешно отправлен на {EMAIL_TO}"
            )
        else:
            await status_msg.edit_text(
                "❌ Ошибка при отправке на email. Попробуй еще раз."
            )

        # Удаление временного файла
        if os.path.exists(file_path):
            os.remove(file_path)

    except Exception as e:
        logger.error(f"Ошибка обработки файла: {str(e)}")
        await status_msg.edit_text(
            "❌ Произошла ошибка при обработке файла."
        )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработка фотографий"""
    photo = update.message.photo[-1]  # Берем фото в лучшем качестве

    # Уведомление о начале обработки
    status_msg = await update.message.reply_text("⏳ Получаю фото...")

    try:
        # Скачивание файла
        file = await context.bot.get_file(photo.file_id)
        file_name = f"photo_{photo.file_unique_id}.jpg"
        file_path = f"/tmp/{file_name}"
        await file.download_to_drive(file_path)

        # Обновление статуса
        await status_msg.edit_text("📧 Отправляю на email...")

        # Информация о пользователе
        user = update.message.from_user
        user_info = f"{user.full_name} (@{user.username or 'без username'})"

        # Отправка на email
        if send_email(file_path, file_name, user_info):
            await status_msg.edit_text(
                f"✅ Фото успешно отправлено на {EMAIL_TO}"
            )
        else:
            await status_msg.edit_text(
                "❌ Ошибка при отправке на email. Попробуй еще раз."
            )

        # Удаление временного файла
        if os.path.exists(file_path):
            os.remove(file_path)

    except Exception as e:
        logger.error(f"Ошибка обработки фото: {str(e)}")
        await status_msg.edit_text(
            "❌ Произошла ошибка при обработке фото."
        )


def main():
    """Запуск бота"""
    logger.info("Запуск Telegram бота...")

    # Создание приложения
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Регистрация обработчиков команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))

    # Регистрация обработчиков файлов
    application.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    application.add_handler(MessageHandler(filters.PHOTO, handle_photo))

    # Запуск бота
    logger.info("Бот успешно запущен!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
