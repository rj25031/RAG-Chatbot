from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import MessageRead
from app.schemas.conversation import ConversationDetail, ConversationListItem
from app.services.conversations import (
    delete_conversation,
    delete_folder_conversations,
    get_conversation_detail,
    list_conversations,
)

router = APIRouter()


@router.get("", response_model=list[ConversationListItem])
def user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationListItem]:
    conversations = list_conversations(db, current_user.id)
    return [
        ConversationListItem(
            id=item.id,
            user_id=item.user_id,
            folder_id=item.folder_id,
            title=item.title,
            summary=item.summary,
            last_message_at=item.last_message_at,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in conversations
    ]


@router.get("/{conversation_id}", response_model=ConversationDetail)
def conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationDetail:
    conversation = get_conversation_detail(db, conversation_id)
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationDetail(
        id=conversation.id,
        user_id=conversation.user_id,
        folder_id=conversation.folder_id,
        title=conversation.title,
        summary=conversation.summary,
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=[
            MessageRead(
                id=message.id,
                role=message.role,
                content=message.content,
                citations=message.citations,
                source_count=message.source_count,
                created_at=message.created_at,
            )
            for message in conversation.messages
        ],
    )


@router.delete("", status_code=204)
def remove_folder_conversations(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    delete_folder_conversations(db, current_user.id, folder_id)


@router.delete("/{conversation_id}", status_code=204)
def remove_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    delete_conversation(db, current_user.id, conversation_id)
