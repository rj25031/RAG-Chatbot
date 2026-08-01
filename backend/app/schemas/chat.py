from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ChatRequest(BaseModel):
    user_id: int | None = None
    folder_id: int
    document_id: int | None = None
    question: str = Field(min_length=1, max_length=8000)
    conversation_id: int | None = None
    edit_message_id: int | None = None
    model: str | None = Field(default=None, max_length=200)
    top_k: int = Field(default=6, ge=1, le=20)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Question is required")
        return cleaned

    @field_validator("model")
    @classmethod
    def strip_model(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class Citation(BaseModel):
    document_id: int
    filename: str
    page_number: int
    chunk_index: int
    quote: str
    citation_label: str
    score: float


class MessageRead(BaseModel):
    id: int
    role: str
    content: str
    citations: list[Citation] | None = None
    source_count: int
    created_at: datetime


class ConversationRead(BaseModel):
    id: int
    user_id: int
    folder_id: int
    title: str
    summary: str | None
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ChatResponse(BaseModel):
    conversation_id: int
    user_message: MessageRead
    assistant_message: MessageRead
    answer: str
    citations: list[Citation]
