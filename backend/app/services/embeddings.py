from __future__ import annotations

from functools import lru_cache

from openai import OpenAI

from app.core.config import settings

# OpenRouter exposes an OpenAI-compatible embeddings endpoint. Keep batches modest
# so provider-side request size limits are respected.
EMBED_BATCH_SIZE = 96


@lru_cache(maxsize=1)
def get_embedding_model() -> OpenAI:
    return OpenAI(base_url=settings.open_router_base_url, api_key=settings.open_router_api_key)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    client = get_embedding_model()
    embeddings: list[list[float]] = []

    for start in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[start : start + EMBED_BATCH_SIZE]
        response = client.embeddings.create(
            model=settings.embedding_model,
            input=batch,
        )
        # OpenAI-compatible APIs may return items out of order; sort by index.
        ordered = sorted(response.data, key=lambda item: item.index)
        embeddings.extend(item.embedding for item in ordered)

    if len(embeddings) != len(texts):
        raise RuntimeError(
            f"Embedding count mismatch: expected {len(texts)}, got {len(embeddings)}"
        )

    return embeddings


def get_model_embedding_dimension() -> int:
    """Probe the embedding model once to learn the size of the vectors it returns."""
    vectors = embed_texts(["embedding dimension probe"])
    return len(vectors[0])
