"""document_chunks embedding dim change to 2048-d OpenRouter (NVIDIA) embeddings

Revision ID: 20261004_0006
Revises: 20260731_0005
Create Date: 2026-10-04
"""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import HALFVEC, Vector


revision = "20261004_0006"
down_revision = "20260731_0005"
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
            summary = 'Re-upload required after embedding model change (1024 -> 2048 dimensions).'
        WHERE status IN ('ready', 'processing', 'empty')
        """
    )
    op.drop_column("document_chunks", "embedding")
    op.add_column(
        "document_chunks",
        sa.Column("embedding", HALFVEC(2048), nullable=False),
    )
    # Recreate IVFFlat index for cosine distance search.
    # halfvec is required: pgvector ivfflat only indexes up to 2000 dims for the
    # fp32 vector type, while halfvec supports up to 4000 dims.
    op.execute(
        """
        CREATE INDEX ix_document_chunks_embedding
        ON document_chunks
        USING ivfflat (embedding halfvec_cosine_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    op.execute("DELETE FROM document_chunks")
    op.drop_column("document_chunks", "embedding")
    op.add_column(
        "document_chunks",
        sa.Column("embedding", Vector(1024), nullable=False),
    )
    op.execute(
        """
        CREATE INDEX ix_document_chunks_embedding
        ON document_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )
