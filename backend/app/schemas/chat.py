from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    user_id: int | None = None
    folder_id: int
    document_id: int | None = None
    question: str
    conversation_id: int | None = None
    edit_message_id: int | None = None
    model: str | None = None
    top_k: int = 6


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
