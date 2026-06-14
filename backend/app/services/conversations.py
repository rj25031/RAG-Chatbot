from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models.conversation import Conversation
from app.models.folder import Folder
from app.models.message import Message
from app.models.user import User


def create_conversation(db: Session, user_id: int, folder_id: int, title: str) -> Conversation:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    conversation = Conversation(
        user_id=user_id,
        folder_id=folder_id,
        title=title,
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(conversation)
    db.flush()
    return conversation


def get_or_create_conversation(
    db: Session,
    conversation_id: int | None,
    user_id: int,
    folder_id: int,
    question: str,
) -> Conversation:
    if conversation_id is not None:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None or conversation.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    trimmed = " ".join(question.split())
    title = trimmed[:80] if trimmed else "New chat"
    return create_conversation(db, user_id, folder_id, title)


def append_message(
    db: Session,
    conversation: Conversation,
    role: str,
    content: str,
    citations: list[dict] | None = None,
) -> Message:
    message = Message(
        conversation_id=conversation.id,
        role=role,
        content=content,
        citations=citations,
        source_count=len(citations or []),
    )
    db.add(message)
    conversation.last_message_at = datetime.now(timezone.utc)
    return message


def truncate_conversation_from_message(
    db: Session,
    conversation: Conversation,
    message_id: int,
    replacement_content: str,
) -> None:
    target_message = db.scalar(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation.id,
        )
    )
    if target_message is None or target_message.role != "user":
        raise HTTPException(status_code=404, detail="Editable message not found")

    first_message = db.scalar(
        select(Message)
        .where(Message.conversation_id == conversation.id)
        .order_by(Message.id.asc())
    )

    messages_to_delete = db.scalars(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.id >= target_message.id,
        )
        .order_by(Message.id.desc())
    ).all()
    for message in messages_to_delete:
        db.delete(message)

    trimmed = " ".join(replacement_content.split())
    if first_message is not None and target_message.id == first_message.id:
        conversation.title = trimmed[:80] if trimmed else "New chat"

    conversation.last_message_at = datetime.now(timezone.utc)


def list_conversations(db: Session, user_id: int) -> list[Conversation]:
    statement = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.last_message_at.desc(), Conversation.created_at.desc())
    )
    return list(db.scalars(statement).all())


def get_conversation_detail(db: Session, conversation_id: int) -> Conversation:
    statement = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conversation = db.scalar(statement)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


def delete_conversation(db: Session, user_id: int, conversation_id: int) -> None:
    conversation = db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conversation)
    db.commit()


def delete_folder_conversations(db: Session, user_id: int, folder_id: int) -> None:
    folder = db.get(Folder, folder_id)
    if folder is None or folder.owner_id != user_id:
        raise HTTPException(status_code=404, detail="Folder not found")

    db.execute(
        delete(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.folder_id == folder_id,
        )
    )
    db.commit()
