"""sync timestamp defaults on legacy tables"""

from alembic import op
import sqlalchemy as sa


revision = "20260612_0003"
down_revision = "20260612_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE folders SET created_at = now() WHERE created_at IS NULL")
    op.execute("UPDATE folders SET updated_at = now() WHERE updated_at IS NULL")
    op.execute("UPDATE documents SET created_at = now() WHERE created_at IS NULL")
    op.execute("UPDATE documents SET updated_at = now() WHERE updated_at IS NULL")
    op.execute("UPDATE document_chunks SET created_at = now() WHERE created_at IS NULL")

    op.alter_column("folders", "created_at", existing_type=sa.DateTime(timezone=True), server_default=sa.text("now()"))
    op.alter_column("folders", "updated_at", existing_type=sa.DateTime(timezone=True), server_default=sa.text("now()"))
    op.alter_column("documents", "created_at", existing_type=sa.DateTime(timezone=True), server_default=sa.text("now()"))
    op.alter_column("documents", "updated_at", existing_type=sa.DateTime(timezone=True), server_default=sa.text("now()"))
    op.alter_column(
        "document_chunks",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
    )


def downgrade() -> None:
    op.alter_column("document_chunks", "created_at", existing_type=sa.DateTime(timezone=True), server_default=None)
    op.alter_column("documents", "updated_at", existing_type=sa.DateTime(timezone=True), server_default=None)
    op.alter_column("documents", "created_at", existing_type=sa.DateTime(timezone=True), server_default=None)
    op.alter_column("folders", "updated_at", existing_type=sa.DateTime(timezone=True), server_default=None)
    op.alter_column("folders", "created_at", existing_type=sa.DateTime(timezone=True), server_default=None)
