from rag_app.storage.vector.base import RetrievedChunk

SYSTEM_PROMPT = (
    "Ты — ассистент, который отвечает только на основе предоставленного контекста. "
    "Если информации недостаточно, честно скажи об этом."
)


def build_messages(question: str, contexts: list[RetrievedChunk]) -> list[dict[str, str]]:
    context_block = "\n\n".join(
        f"[{idx + 1}] (doc: {ctx.document_name}) {ctx.content}" for idx, ctx in enumerate(contexts)
    )
    user_prompt = (
        "Ответь на вопрос, используя только предоставленный контекст.\n\n"
        f"Контекст:\n{context_block or 'Нет контекста'}\n\n"
        f"Вопрос: {question}"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
