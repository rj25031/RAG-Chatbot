from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_descendant_folder_ids(db: Session, folder_id: int) -> list[int]:
    query = text(
        """
        WITH RECURSIVE folder_tree AS (
            SELECT id, parent_folder_id
            FROM folders
            WHERE id = :folder_id
            UNION ALL
            SELECT f.id, f.parent_folder_id
            FROM folders f
            INNER JOIN folder_tree ft ON f.parent_folder_id = ft.id
        )
        SELECT id FROM folder_tree
        """
    )
    rows = db.execute(query, {"folder_id": folder_id}).all()
    return [row[0] for row in rows]

