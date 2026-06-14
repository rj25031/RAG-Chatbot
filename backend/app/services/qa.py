from __future__ import annotations

from sqlalchemy.orm import Session

from app.langgraph.graph import build_qa_graph
from app.models.conversation import Conversation
from app.schemas.chat import ChatRequest, ChatResponse, Citation, MessageRead
from app.services.conversations import (
    append_message,
    get_or_create_conversation,
    truncate_conversation_from_message,
)
from app.services.retriever import retrieve_chunks

qa_graph = build_qa_graph()


def answer_question(db: Session, payload: ChatRequest) -> ChatResponse:
    rows = retrieve_chunks(
        db,
        payload.folder_id,
        payload.question,
        payload.top_k,
        payload.document_id,
    )
    conversation = get_or_create_conversation(
        db,
        conversation_id=payload.conversation_id,
        user_id=payload.user_id,
        folder_id=payload.folder_id,
        question=payload.question,
    )
    if payload.edit_message_id is not None:
        truncate_conversation_from_message(
            db,
            conversation,
            payload.edit_message_id,
            payload.question,
        )

    user_message = append_message(db, conversation, role="user", content=payload.question)
    if not rows:
        answer = "I could not find relevant content in this folder tree yet. Upload PDFs to this folder or its children and try again."
        assistant_message = append_message(db, conversation, role="assistant", content=answer, citations=[])
        db.commit()
        db.refresh(user_message)
        db.refresh(assistant_message)
        db.refresh(conversation)
        return build_chat_response(conversation, user_message, assistant_message, answer, [])

    context_parts: list[str] = []
    citations: list[Citation] = []

    for chunk, filename, distance in rows:
        context_parts.append(f"[{chunk.citation_label}] {chunk.content}")
        citations.append(
            Citation(
                document_id=chunk.document_id,
                filename=filename,
                page_number=chunk.page_number,
                chunk_index=chunk.chunk_index,
                quote=chunk.content,
                citation_label=chunk.citation_label,
                score=max(0.0, 1 - float(distance)),
            )
        )

    result = qa_graph.invoke(
        {
            "question": payload.question,
            "context": "\n\n".join(context_parts),
            "model": payload.model or "",
        }
    )
    assistant_message = append_message(
        db,
        conversation,
        role="assistant",
        content=result["answer"],
        citations=[citation.model_dump() for citation in citations],
    )
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)
    db.refresh(conversation)
    return build_chat_response(conversation, user_message, assistant_message, result["answer"], citations)


def build_chat_response(
    conversation: Conversation,
    user_message,
    assistant_message,
    answer: str,
    citations: list[Citation],
) -> ChatResponse:
    return ChatResponse(
        conversation_id=conversation.id,
        user_message=MessageRead(
            id=user_message.id,
            role=user_message.role,
            content=user_message.content,
            citations=None,
            source_count=user_message.source_count,
            created_at=user_message.created_at,
        ),
        assistant_message=MessageRead(
            id=assistant_message.id,
            role=assistant_message.role,
            content=assistant_message.content,
            citations=citations,
            source_count=assistant_message.source_count,
            created_at=assistant_message.created_at,
        ),
        answer=answer,
        citations=citations,
    )
