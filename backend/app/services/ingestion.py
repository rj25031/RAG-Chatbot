from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.chunking import chunk_text
from app.services.embeddings import embed_texts
from app.services.pdf_parser import extract_pdf_pages

logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF"


def _safe_unlink(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Failed to remove upload file %s", path, exc_info=True)


async def ingest_document(
    db: Session,
    folder_id: int,
    uploaded_by_user_id: int | None,
    upload: UploadFile,
) -> Document:
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    original_filename = (upload.filename or "document.pdf").strip() or "document.pdf"
    if not original_filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > settings.max_upload_bytes:
        max_mb = settings.max_upload_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"PDF exceeds the maximum size of {max_mb} MB",
        )
    if not content.startswith(PDF_MAGIC):
        raise HTTPException(status_code=400, detail="File does not look like a valid PDF")

    filename = f"{uuid4()}-{Path(original_filename).name}"
    destination = settings.upload_path / filename
    destination.write_bytes(content)

    document = Document(
        folder_id=folder_id,
        uploaded_by_user_id=uploaded_by_user_id,
        filename=destination.name,
        original_filename=original_filename,
        storage_path=str(destination),
        mime_type=upload.content_type or "application/pdf",
        file_size=len(content),
        status="processing",
    )
    db.add(document)

    try:
        db.flush()

        pages = extract_pdf_pages(destination)
        chunk_rows: list[tuple[int, int, str, str]] = []
        for page_number, page_text in pages:
            for chunk_index, chunk in enumerate(chunk_text(page_text)):
                citation_label = f"{document.original_filename} | p.{page_number}"
                chunk_rows.append((page_number, chunk_index, chunk, citation_label))

        document.page_count = len(pages)

        if not chunk_rows:
            document.status = "empty"
            document.summary = (
                f"{document.page_count} pages found but no extractable text. "
                "Scanned or image-only PDFs are not supported without OCR."
            )
            db.commit()
            db.refresh(document)
            return document

        embeddings = embed_texts([row[2] for row in chunk_rows])
        for row, embedding in zip(chunk_rows, embeddings, strict=True):
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

        document.status = "ready"
        document.summary = f"{document.page_count} pages indexed into {len(chunk_rows)} chunks."
        db.commit()
        db.refresh(document)
        return document
    except HTTPException:
        db.rollback()
        _safe_unlink(destination)
        raise
    except Exception as exc:
        db.rollback()
        _safe_unlink(destination)
        logger.exception("Document ingestion failed for %s", original_filename)
        raise HTTPException(
            status_code=500,
            detail="Failed to process PDF. Please try again or use a different file.",
        ) from exc
