"""unique folder names per owner and parent

Revision ID: 20260731_0004
Revises: 7f9615368f5f
Create Date: 2026-07-31
"""

from alembic import op


revision = "20260731_0004"
down_revision = "7f9615368f5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Collapse any pre-existing duplicates so unique indexes can be applied.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY owner_id, parent_folder_id, name
                    ORDER BY id
                ) AS rn
            FROM folders
        )
        UPDATE folders AS f
        SET name = f.name || ' (' || ranked.rn || ')'
        FROM ranked
        WHERE f.id = ranked.id
          AND ranked.rn > 1
        """
    )
    # PostgreSQL UNIQUE treats NULLs as distinct, so root folders need a partial index.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_folders_owner_root_name
        ON folders (owner_id, name)
        WHERE parent_folder_id IS NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_folders_owner_parent_name
        ON folders (owner_id, parent_folder_id, name)
        WHERE parent_folder_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_folders_owner_parent_name")
    op.execute("DROP INDEX IF EXISTS uq_folders_owner_root_name")
