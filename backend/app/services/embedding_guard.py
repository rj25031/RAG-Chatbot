from __future__ import annotations

import logging
import re

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.embeddings import get_model_embedding_dimension

logger = logging.getLogger(__name__)

_DIMENSION_RE = re.compile(r"\((\d+)\)")


def get_db_embedding_dimension(db: Session) -> int | None:
    """Return the dimension of document_chunks.embedding, or None if it cannot be read."""
    try:
        column_type = db.execute(
            text(
                """
                SELECT format_type(a.atttypid, a.atttypmod)
                FROM pg_attribute a
                WHERE a.attrelid = 'document_chunks'::regclass
                  AND a.attname = 'embedding'
                  AND a.attnum > 0
                  AND NOT a.attisdropped
                """
            )
        ).scalar()
    except Exception:
        logger.warning("Could not inspect document_chunks.embedding column type", exc_info=True)
        return None

    if not column_type:
        return None
    match = _DIMENSION_RE.search(column_type)
    return int(match.group(1)) if match else None


def verify_embedding_dimension(db: Session) -> None:
    """Fail fast at startup when the embedding model no longer matches the DB column.

    A mismatch (for example swapping MODEL_NAME to a model with a different output
    dimension) would otherwise only surface at the first chunk insert or retrieval
    query, where it is much harder to diagnose.
    """
    db_dim = get_db_embedding_dimension(db)
    if db_dim is None:
        raise RuntimeError(
            "Could not determine the dimension of document_chunks.embedding. "
            "Make sure the database is migrated (alembic upgrade head) before starting the API."
        )

    try:
        model_dim = get_model_embedding_dimension()
    except Exception:
        # A transient provider/network error must not block startup; surface it clearly instead.
        logger.warning(
            "Could not probe embedding model '%s' dimension at startup; "
            "skipping the embedding dimension check.",
            settings.embedding_model,
            exc_info=True,
        )
        return

    if model_dim != db_dim:
        raise RuntimeError(
            f"Embedding dimension mismatch: model '{settings.embedding_model}' returns "
            f"{model_dim}-d vectors but document_chunks.embedding is {db_dim}-d. "
            "Align the model and column dimension (and re-index documents) before starting the API."
        )

    logger.info(
        "Embedding dimension check passed: %s returns %d-d vectors matching document_chunks.embedding.",
        settings.embedding_model,
        db_dim,
    )
