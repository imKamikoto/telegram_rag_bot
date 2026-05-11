from aiogram.types import KeyboardButton, ReplyKeyboardMarkup


def main_keyboard(is_admin: bool = False) -> ReplyKeyboardMarkup:
    rows = [
        [KeyboardButton(text="/kb"), KeyboardButton(text="/reset")],
    ]
    if is_admin:
        rows.append([KeyboardButton(text="/admin")])
    else:
        rows.append([KeyboardButton(text="/code")])
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        input_field_placeholder="Задай вопрос",
    )
