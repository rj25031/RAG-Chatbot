from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    folder_id: int
    uploaded_by_user_id: int | None
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    page_count: int
    status: str
    summary: str | None
    folder_name: str | None = None
    created_at: datetime
    updated_at: datetime


class DocumentChunkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    page_number: int
    chunk_index: int
    token_count: int
    character_count: int
    content: str
    citation_label: str
    created_at: datetime


class DocumentDetailRead(DocumentRead):
    folder_name: str | None = None
    folder_path: list[str] = []
    citations: list[DocumentChunkRead] = []
