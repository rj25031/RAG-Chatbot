from __future__ import annotations

from groq import Groq

from app.core.config import settings

SYSTEM_PROMPT = (
    "You are a document Q&A assistant. Answer using the provided document context "
    "and the conversation so far. Prefer facts from the document context; use chat "
    "history to resolve references like 'that', 'it', or 'the second point'. "
    "If the context does not support an answer, say so clearly."
)


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


def generate_answer(
    question: str,
    context: str,
    model: str | None = None,
    history: list[dict[str, str]] | None = None,
) -> str:
    """Generate an answer with document context and optional prior chat turns.

    ``history`` items should be ``{"role": "user"|"assistant", "content": "..."}``
    and must not include the current question.
    """
    client = get_groq_client()

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    for turn in history or []:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role not in {"user", "assistant"} or not content:
            continue
        messages.append({"role": role, "content": content})

    user_prompt = (
        "Document context:\n"
        f"{context}\n\n"
        "Current question:\n"
        f"{question}\n\n"
        "Return a concise answer grounded in the document context. "
        "Use conversation history only to interpret the question. "
    )
    messages.append({"role": "user", "content": user_prompt})

    completion = client.chat.completions.create(
        model=model or settings.groq_model,
        messages=messages,
        temperature=0.1,
    )
    return completion.choices[0].message.content or "I could not generate an answer."
