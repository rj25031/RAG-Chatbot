from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.langgraph.graph import build_qa_graph
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.message import Message
from app.schemas.chat import ChatRequest, ChatResponse, Citation, MessageRead
from app.services.conversations import (
    append_message,
    get_or_create_conversation,
    get_recent_messages,
    truncate_conversation_from_message,
)
from app.services.folders import get_descendant_folder_ids
from app.services.retriever import retrieve_chunks

qa_graph = build_qa_graph()

# Keep enough turns for follow-ups without blowing the prompt window.
HISTORY_MESSAGE_LIMIT = 12
RETRIEVAL_HISTORY_TURNS = 4


def _validate_document_scope(db: Session, folder_id: int, document_id: int | None) -> None:
    if document_id is None:
        return

    folder_ids = get_descendant_folder_ids(db, folder_id)
    document = db.scalar(
        select(Document).where(
            Document.id == document_id,
            Document.folder_id.in_(folder_ids),
        )
    )
    if document is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found in the selected folder tree",
        )


def _history_for_llm(messages: list[Message]) -> list[dict[str, str]]:
    history: list[dict[str, str]] = []
    for message in messages:
        if message.role not in {"user", "assistant"}:
            continue
        content = (message.content or "").strip()
        if not content:
            continue
        history.append({"role": message.role, "content": content})
    return history


def _retrieval_query(question: str, history: list[dict[str, str]]) -> str:
    """Blend recent turns into the retrieval query so short follow-ups still match."""
    if not history:
        return question

    recent = history[-RETRIEVAL_HISTORY_TURNS:]
    prior = " ".join(turn["content"] for turn in recent if turn["role"] == "user")
    prior = " ".join(prior.split())
    if not prior:
        return question

    # Cap history text so the embedding stays focused on the current ask.
    if len(prior) > 600:
        prior = prior[-600:]
    return f"{prior}\n\n{question}"


def answer_question(db: Session, payload: ChatRequest) -> ChatResponse:
    _validate_document_scope(db, payload.folder_id, payload.document_id)

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

    prior_messages = get_recent_messages(
        db,
        conversation.id,
        limit=HISTORY_MESSAGE_LIMIT,
    )
    history = _history_for_llm(prior_messages)
    retrieval_question = _retrieval_query(payload.question, history)

    rows = retrieve_chunks(
        db,
        payload.folder_id,
        retrieval_question,
        payload.top_k,
        payload.document_id,
    )
    user_message = append_message(db, conversation, role="user", content=payload.question)
    if not rows:
        answer = (
            "I could not find relevant content in this folder tree yet. "
            "Upload PDFs to this folder or its children and try again."
        )
        assistant_message = append_message(
            db,
            conversation,
            role="assistant",
            content=answer,
            citations=[],
        )
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
            "history": history,
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
    return build_chat_response(
        conversation,
        user_message,
        assistant_message,
        result["answer"],
        citations,
    )


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
