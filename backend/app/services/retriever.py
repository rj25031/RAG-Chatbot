from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.services.embeddings import embed_texts
from app.services.folders import get_descendant_folder_ids


def retrieve_chunks(
    db: Session,
    folder_id: int,
    question: str,
    top_k: int = 6,
    document_id: int | None = None,
):
    folder_ids = get_descendant_folder_ids(db, folder_id)
    query_embedding = embed_texts([question])[0]

    distance = DocumentChunk.embedding.cosine_distance(query_embedding)
    statement = (
        select(DocumentChunk, Document.original_filename, distance.label("distance"))
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(DocumentChunk.folder_id.in_(folder_ids))
    )
    if document_id is not None:
        statement = statement.where(DocumentChunk.document_id == document_id)
    statement = statement.order_by(distance.asc()).limit(top_k)
    rows = db.execute(statement).all()
    return rows
