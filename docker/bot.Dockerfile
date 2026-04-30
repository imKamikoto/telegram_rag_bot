FROM ghcr.io/astral-sh/uv:python3.11-bookworm

WORKDIR /app

# Install dependencies
COPY bot_app/pyproject.toml /app/pyproject.toml
RUN uv sync --no-dev

# Copy source
COPY bot_app /app

ENV UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:${PATH}" \
    PYTHONPATH=/app

CMD ["uv", "run", "python", "main.py"]
