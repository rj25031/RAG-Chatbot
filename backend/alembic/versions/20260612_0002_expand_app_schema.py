"""expand app schema"""

from alembic import op
import sqlalchemy as sa


revision = "20260612_0002"
down_revision = "20260612_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.execute(
        """
        INSERT INTO users (full_name, email, password_hash, is_active, created_at, updated_at)
        VALUES ('Default User', 'owner@local.dev', 'temporary-password-hash', true, now(), now())
        """
    )

    op.add_column("folders", sa.Column("owner_id", sa.Integer(), nullable=True))
    op.add_column("folders", sa.Column("description", sa.Text(), nullable=True))
    op.execute("UPDATE folders SET owner_id = 1 WHERE owner_id IS NULL")
    op.alter_column("folders", "owner_id", nullable=False)
    op.create_foreign_key("fk_folders_owner_id_users", "folders", "users", ["owner_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_folders_owner_id", "folders", ["owner_id"])

    op.add_column("documents", sa.Column("uploaded_by_user_id", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("original_filename", sa.String(length=255), nullable=True))
    op.add_column("documents", sa.Column("mime_type", sa.String(length=100), nullable=False, server_default="application/pdf"))
    op.add_column("documents", sa.Column("file_size", sa.BigInteger(), nullable=False, server_default="0"))
    op.add_column("documents", sa.Column("summary", sa.Text(), nullable=True))
    op.execute("UPDATE documents SET original_filename = filename WHERE original_filename IS NULL")
    op.alter_column("documents", "original_filename", nullable=False)
    op.create_foreign_key(
        "fk_documents_uploaded_by_user_id_users",
        "documents",
        "users",
        ["uploaded_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_documents_uploaded_by_user_id", "documents", ["uploaded_by_user_id"])

    op.rename_table("chunks", "document_chunks")
    op.execute("ALTER INDEX ix_chunks_document_id RENAME TO ix_document_chunks_document_id")
    op.execute("ALTER INDEX ix_chunks_folder_id RENAME TO ix_document_chunks_folder_id")
    op.execute("ALTER INDEX ix_chunks_embedding RENAME TO ix_document_chunks_embedding")
    op.add_column("document_chunks", sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("document_chunks", sa.Column("character_count", sa.Integer(), nullable=False, server_default="0"))
    op.execute("UPDATE document_chunks SET token_count = 0, character_count = char_length(content)")

    op.create_table(
        "conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("folder_id", sa.Integer(), sa.ForeignKey("folders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])
    op.create_index("ix_conversations_folder_id", "conversations", ["folder_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("citations", sa.JSON(), nullable=True),
        sa.Column("source_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_table("messages")
    op.drop_index("ix_conversations_folder_id", table_name="conversations")
    op.drop_index("ix_conversations_user_id", table_name="conversations")
    op.drop_table("conversations")

    op.drop_column("document_chunks", "character_count")
    op.drop_column("document_chunks", "token_count")
    op.execute("ALTER INDEX ix_document_chunks_embedding RENAME TO ix_chunks_embedding")
    op.execute("ALTER INDEX ix_document_chunks_folder_id RENAME TO ix_chunks_folder_id")
    op.execute("ALTER INDEX ix_document_chunks_document_id RENAME TO ix_chunks_document_id")
    op.rename_table("document_chunks", "chunks")

    op.drop_index("ix_documents_uploaded_by_user_id", table_name="documents")
    op.drop_constraint("fk_documents_uploaded_by_user_id_users", "documents", type_="foreignkey")
    op.drop_column("documents", "summary")
    op.drop_column("documents", "file_size")
    op.drop_column("documents", "mime_type")
    op.drop_column("documents", "original_filename")
    op.drop_column("documents", "uploaded_by_user_id")

    op.drop_index("ix_folders_owner_id", table_name="folders")
    op.drop_constraint("fk_folders_owner_id_users", "folders", type_="foreignkey")
    op.drop_column("folders", "description")
    op.drop_column("folders", "owner_id")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
