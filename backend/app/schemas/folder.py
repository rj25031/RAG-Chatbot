from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FolderCreate(BaseModel):
    owner_id: int | None = None
    name: str
    description: str | None = None
    parent_folder_id: int | None = None


class FolderUpdate(BaseModel):
    name: str
    description: str | None = None


class FolderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    description: str | None
    parent_folder_id: int | None
    created_at: datetime
    updated_at: datetime


class FolderTreeNode(FolderRead):
    direct_document_count: int = 0
    total_document_count: int = 0
    children: list["FolderTreeNode"] = Field(default_factory=list)


FolderTreeNode.model_rebuild()
