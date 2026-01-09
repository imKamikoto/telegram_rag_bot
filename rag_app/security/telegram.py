from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qsl


@dataclass
class TelegramWebAppUser:
    id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    language_code: str | None

    @property
    def display_name(self) -> str:
        parts = [self.first_name or "", self.last_name or ""]
        full = " ".join(part for part in parts if part).strip()
        if full:
            return full
        if self.username:
            return self.username
        return f"user-{self.id}"


class TelegramAuthError(ValueError):
    """Raised when Telegram init data validation fails."""


def parse_telegram_init_data(
    init_data: str, bot_token: str, max_age_seconds: int | None = 600
) -> TelegramWebAppUser:
    """
    Validate Telegram WebApp initData and return parsed user payload.

    Implements the official validation steps from
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app.
    """
    if not init_data:
        raise TelegramAuthError("Telegram init data is required")
    if not bot_token:
        raise TelegramAuthError("Telegram bot token is not configured")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("Missing Telegram init data hash")

    auth_date_raw = parsed.get("auth_date")
    if auth_date_raw is not None:
        try:
            auth_date = int(auth_date_raw)
        except ValueError as exc:
            raise TelegramAuthError("Invalid auth_date in Telegram init data") from exc

        if max_age_seconds and auth_date > 0:
            now = int(time.time())
            if now - auth_date > max_age_seconds:
                raise TelegramAuthError("Telegram init data is too old")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))

    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise TelegramAuthError("Invalid Telegram init data signature")

    user_raw = parsed.get("user")
    if not user_raw:
        raise TelegramAuthError("Telegram user payload is missing")

    try:
        user_data: dict[str, Any] = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise TelegramAuthError("Telegram user payload is not valid JSON") from exc

    user_id = user_data.get("id")
    if user_id is None:
        raise TelegramAuthError("Telegram user id is missing")

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError) as exc:
        raise TelegramAuthError("Telegram user id is invalid") from exc

    return TelegramWebAppUser(
        id=user_id_int,
        username=user_data.get("username"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        language_code=user_data.get("language_code"),
    )
