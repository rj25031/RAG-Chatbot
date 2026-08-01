"""db input size change to 1024-d Cohere embeddings

Revision ID: 7f9615368f5f
Revises: 20260612_0003
Create Date: 2026-07-31 11:17:13.641153
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "7f9615368f5f"
down_revision = "20260612_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Dimension changes are not castable; drop old vectors and index, then rebuild.
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    op.execute("DELETE FROM document_chunks")
    op.execute(
        """
        UPDATE documents
        SET status = 'needs_reindex',
            summary = 'Re-upload required after embedding model change (384 → 1024 dimensions).'
        WHERE status IN ('ready', 'processing', 'empty')
        """
    )
    op.drop_column("document_chunks", "embedding")
    op.add_column(
        "document_chunks",
        sa.Column("embedding", Vector(1024), nullable=False),
    )
    # Recreate IVFFlat index for cosine distance search.
    op.execute(
        """
        CREATE INDEX ix_document_chunks_embedding
        ON document_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    op.execute("DELETE FROM document_chunks")
    op.drop_column("document_chunks", "embedding")
    op.add_column(
        "document_chunks",
        sa.Column("embedding", Vector(384), nullable=False),
    )
    op.execute(
        """
        CREATE INDEX ix_document_chunks_embedding
        ON document_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )
