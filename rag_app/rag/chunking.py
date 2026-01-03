def normalize_text(text: str) -> str:
    """Collapse whitespace and strip extra newlines."""
    return " ".join(text.split())


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split text into overlapping character chunks."""
    normalized = normalize_text(text)
    if not normalized:
        return []

    step = max(1, chunk_size - chunk_overlap)
    chunks: list[str] = []
    for start in range(0, len(normalized), step):
        chunk = normalized[start : start + chunk_size]
        if chunk:
            chunks.append(chunk)
    return chunks
