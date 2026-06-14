from __future__ import annotations

from pydantic import BaseModel


class GroqModelRead(BaseModel):
    id: str
    owned_by: str | None = None
    context_window: int | None = None
    active: bool | None = None


class GroqModelListResponse(BaseModel):
    current_model: str
    models: list[GroqModelRead]
