from aiogram.types import KeyboardButton, ReplyKeyboardMarkup


def main_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="/start"), KeyboardButton(text="/reset"), KeyboardButton(text="/code")],
        ],
        resize_keyboard=True,
        input_field_placeholder="Спроси что угодно",
    )

