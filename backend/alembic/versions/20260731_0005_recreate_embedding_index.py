"""recreate document_chunks IVFFlat embedding index

Revision ID: 20260731_0005
Revises: 20260731_0004
Create Date: 2026-07-31
"""

from alembic import op


revision = "20260731_0005"
down_revision = "20260731_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_document_chunks_embedding")
    # IVFFlat requires rows for useful lists, but empty-table create is allowed.
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
