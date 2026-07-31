from __future__ import annotations

from functools import lru_cache

# from sentence_transformers import SentenceTransformer
from openai import OpenAI
from app.core.config import settings


@lru_cache(maxsize=1)
# def get_embedding_model() -> SentenceTransformer:
#     return SentenceTransformer(settings.embedding_model)

def get_embedding_model() -> OpenAI:
    return OpenAI(base_url=settings.cohere_base_url, api_key=settings.cohere_api_key,)


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    response = model.embeddings.create(
        model=settings.embedding_model,
        input=texts
    )
    return [item.embedding for item in response.data]

