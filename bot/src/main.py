import asyncio
import logging

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from src.api_client import SaludPlusApi, SaludPlusApiError
from src.assistant import (
    AssistantError,
    SaludPlusAssistant,
    filtrar_pacientes,
    format_dashboard,
    format_patients,
)
from src.config import Settings, get_settings


logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def _services(context: ContextTypes.DEFAULT_TYPE):
    data = context.application.bot_data
    return data["settings"], data["api"], data["assistant"]


async def _authorized(update: Update, settings: Settings) -> bool:
    chat = update.effective_chat
    message = update.effective_message
    if chat is None or message is None:
        return False

    allowed = settings.allowed_chat_ids
    if not allowed:
        await message.reply_text(
            "El bot todavía no tiene chats autorizados. "
            f"Tu chat ID es {chat.id}. Agrégalo a BOT_ALLOWED_CHAT_IDS en bot/.env."
        )
        return False
    if chat.id not in allowed:
        await message.reply_text(
            f"Este chat no está autorizado. Chat ID: {chat.id}."
        )
        return False
    return True


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    settings, _, _ = _services(context)
    chat = update.effective_chat
    message = update.effective_message
    if chat is None or message is None:
        return
    if chat.id not in settings.allowed_chat_ids:
        await _authorized(update, settings)
        return
    await message.reply_text(
        "Hola, soy el bot de SaludPlus. Puedo consultar el dashboard y los "
        "pacientes mediante la API.\n\n"
        "Comandos:\n"
        "/dashboard — resumen de métricas\n"
        "/pacientes — pacientes recientes\n"
        "/buscar <nombre o documento> — buscar un paciente\n\n"
        "También puedes hacer preguntas en lenguaje natural."
    )


async def dashboard_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    settings, api, _ = _services(context)
    if not await _authorized(update, settings):
        return
    message = update.effective_message
    assert message is not None
    await message.chat.send_action(ChatAction.TYPING)
    try:
        dashboard = await api.get_dashboard()
        await message.reply_text(format_dashboard(dashboard))
    except SaludPlusApiError as exc:
        await message.reply_text(str(exc))


async def patients_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    settings, api, _ = _services(context)
    if not await _authorized(update, settings):
        return
    message = update.effective_message
    assert message is not None
    await message.chat.send_action(ChatAction.TYPING)
    try:
        patients = await api.get_patients()
        await message.reply_text(format_patients(patients[:15], "Pacientes"))
    except SaludPlusApiError as exc:
        await message.reply_text(str(exc))


async def search_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    settings, api, _ = _services(context)
    if not await _authorized(update, settings):
        return
    message = update.effective_message
    assert message is not None
    query = " ".join(context.args).strip()
    if not query:
        await message.reply_text("Uso: /buscar <nombre, documento, ciudad o EPS>")
        return
    await message.chat.send_action(ChatAction.TYPING)
    try:
        patients = await api.get_patients()
        matches = filtrar_pacientes(query, patients, limit=30)
        await message.reply_text(format_patients(matches, f"Resultados para “{query}”"))
    except SaludPlusApiError as exc:
        await message.reply_text(str(exc))


async def natural_language(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    settings, api, assistant = _services(context)
    if not await _authorized(update, settings):
        return
    message = update.effective_message
    if message is None or not message.text:
        return
    question = message.text.strip()
    await message.chat.send_action(ChatAction.TYPING)
    try:
        dashboard, patients = await asyncio.gather(
            api.get_dashboard(), api.get_patients()
        )
        history = context.user_data.setdefault("history", [])
        answer = await assistant.answer(question, dashboard, patients, history)
        history.extend(
            [
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer},
            ]
        )
        context.user_data["history"] = history[-8:]
        await message.reply_text(answer[:4096])
    except (SaludPlusApiError, AssistantError) as exc:
        await message.reply_text(str(exc))


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("Error no controlado procesando una actualización", exc_info=context.error)
    if isinstance(update, Update) and update.effective_message:
        await update.effective_message.reply_text(
            "Ocurrió un error inesperado. Intenta nuevamente en unos segundos."
        )


def build_application(
    settings: Settings, api: SaludPlusApi, assistant: SaludPlusAssistant
) -> Application:
    async def close_api(_: Application) -> None:
        await api.close()

    application = (
        Application.builder()
        .token(settings.bot_token)
        .post_shutdown(close_api)
        .build()
    )
    application.bot_data.update(
        {"settings": settings, "api": api, "assistant": assistant}
    )
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("dashboard", dashboard_command))
    application.add_handler(CommandHandler("pacientes", patients_command))
    application.add_handler(CommandHandler("buscar", search_command))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, natural_language)
    )
    application.add_error_handler(on_error)
    return application


def main() -> None:
    settings = get_settings()
    api = SaludPlusApi(settings)
    assistant = SaludPlusAssistant(settings)
    application = build_application(settings, api, assistant)
    logger.info("Iniciando bot de SaludPlus")
    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
