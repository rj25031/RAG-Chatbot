from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.chat import MessageRead


class ConversationListItem(BaseModel):
    id: int
    user_id: int
    folder_id: int
    title: str
    summary: str | None
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ConversationDetail(ConversationListItem):
    messages: list[MessageRead]
