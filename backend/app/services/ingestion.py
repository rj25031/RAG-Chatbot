from __future__ import annotations

from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.chunking import chunk_text
from app.services.embeddings import embed_texts
from app.services.pdf_parser import extract_pdf_pages


async def ingest_document(
    db: Session,
    folder_id: int,
    uploaded_by_user_id: int | None,
    upload: UploadFile,
) -> Document:
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4()}-{upload.filename}"
    destination = settings.upload_path / filename

    content = await upload.read()
    destination.write_bytes(content)

    document = Document(
        folder_id=folder_id,
        uploaded_by_user_id=uploaded_by_user_id,
        filename=destination.name,
        original_filename=upload.filename or "document.pdf",
        storage_path=str(destination),
        mime_type=upload.content_type or "application/pdf",
        file_size=len(content),
        status="processing",
    )
    db.add(document)
    db.flush()

    pages = extract_pdf_pages(destination)
    chunk_rows: list[tuple[int, int, str, str]] = []
    for page_number, page_text in pages:
        for chunk_index, chunk in enumerate(chunk_text(page_text)):
            citation_label = f"{document.original_filename} | p.{page_number}"
            chunk_rows.append((page_number, chunk_index, chunk, citation_label))

    embeddings = embed_texts([row[2] for row in chunk_rows]) if chunk_rows else []
    for row, embedding in zip(chunk_rows, embeddings):
        page_number, chunk_index, chunk_content, citation_label = row
        db.add(
            DocumentChunk(
                document_id=document.id,
                folder_id=folder_id,
                page_number=page_number,
                chunk_index=chunk_index,
                token_count=len(chunk_content.split()),
                character_count=len(chunk_content),
                content=chunk_content,
                citation_label=citation_label,
                embedding=embedding,
            )
        )

    document.page_count = len(pages)
    document.status = "ready"
    document.summary = f"{document.page_count} pages indexed into {len(chunk_rows)} chunks."
    db.commit()
    db.refresh(document)
    return document
