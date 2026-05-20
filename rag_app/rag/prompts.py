from rag_app.storage.vector.base import RetrievedChunk

SYSTEM_PROMPT = (
    "Ты — ассистент, который отвечает только на основе предоставленного контекста. "
    "Если информации недостаточно, честно скажи об этом. "
    "Отвечай на том же языке, на котором задан вопрос."
)


def build_messages(
    question: str,
    contexts: list[RetrievedChunk],
    history: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    context_block = "\n\n".join(
        f"[{idx + 1}] (doc: {ctx.document_name}) {ctx.content}"
        for idx, ctx in enumerate(contexts)
    )
    user_prompt = (
        "Ответь на вопрос, используя только предоставленный контекст.\n\n"
        f"Контекст:\n{context_block or 'Нет контекста'}\n\n"
        f"Вопрос: {question}"
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": user_prompt})
    return messages
