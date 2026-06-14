from __future__ import annotations

from groq import Groq

from app.core.config import settings


def get_groq_client() -> Groq:
    return Groq(api_key=settings.groq_api_key)


def get_default_model() -> str:
    return settings.groq_model


def list_groq_models() -> list[dict]:
    client = get_groq_client()
    response = client.models.list()
    models = []
    for item in getattr(response, "data", []):
      models.append(
          {
              "id": getattr(item, "id", ""),
              "owned_by": getattr(item, "owned_by", None),
              "context_window": getattr(item, "context_window", None),
              "active": getattr(item, "active", None),
          }
      )
    return sorted(models, key=lambda model: model["id"])


def generate_answer(prompt: str, model: str | None = None) -> str:
    client = get_groq_client()
    completion = client.chat.completions.create(
        model=model or settings.groq_model,
        messages=[
            {
                "role": "system",
                "content": "You answer questions using only the provided context. Cite evidence inline using the provided citation labels.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
    )
    return completion.choices[0].message.content or "I could not generate an answer."
