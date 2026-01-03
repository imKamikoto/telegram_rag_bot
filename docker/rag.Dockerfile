FROM ghcr.io/astral-sh/uv:python3.11-bookworm

WORKDIR /app

# Install dependencies
COPY rag_app/pyproject.toml /app/pyproject.toml
RUN uv sync --no-dev

# Copy source
COPY rag_app /app

ENV UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:${PATH}" \
    PYTHONPATH=/app

CMD ["sh", "-c", "uv run uvicorn main:app --host ${RAG_API_HOST:-0.0.0.0} --port ${RAG_API_PORT:-8000}"]
