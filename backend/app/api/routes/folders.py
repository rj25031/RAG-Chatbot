from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.document import Document
from app.models.folder import Folder
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderRead, FolderTreeNode, FolderUpdate
from app.services.folders import get_descendant_folder_ids

router = APIRouter()


def remove_uploaded_files(storage_paths: list[str]) -> None:
    upload_root = settings.upload_path
    for storage_path in set(storage_paths):
        try:
            path = Path(storage_path).resolve()
            path.relative_to(upload_root)
        except (OSError, ValueError):
            continue
        if path.is_file():
            path.unlink(missing_ok=True)


@router.get("", response_model=list[FolderTreeNode])
def list_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[FolderTreeNode]:
    folders = db.scalars(
        select(Folder)
        .where(Folder.owner_id == current_user.id)
        .order_by(Folder.name)
    ).all()
    document_counts = {
        folder_id: count
        for folder_id, count in db.execute(
            select(Document.folder_id, func.count(Document.id))
            .join(Folder, Folder.id == Document.folder_id)
            .where(Folder.owner_id == current_user.id)
            .group_by(Document.folder_id)
        ).all()
    }
    nodes = {
        folder.id: FolderTreeNode.model_validate({
            "id": folder.id,
            "owner_id": folder.owner_id,
            "name": folder.name,
            "description": folder.description,
            "parent_folder_id": folder.parent_folder_id,
            "direct_document_count": document_counts.get(folder.id, 0),
            "total_document_count": 0,
            "created_at": folder.created_at,
            "updated_at": folder.updated_at,
            "children": [],
        })
        for folder in folders
    }

    roots: list[FolderTreeNode] = []
    for folder in nodes.values():
        if folder.parent_folder_id and folder.parent_folder_id in nodes:
            nodes[folder.parent_folder_id].children.append(folder)
        else:
            roots.append(folder)

    def fill_totals(node: FolderTreeNode) -> int:
        total = node.direct_document_count + sum(fill_totals(child) for child in node.children)
        node.total_document_count = total
        return total

    for root in roots:
        fill_totals(root)
    return roots


@router.post("", response_model=FolderRead, status_code=201)
def create_folder(
    payload: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Folder:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    if payload.parent_folder_id is not None:
        parent = db.get(Folder, payload.parent_folder_id)
        if parent is None:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        if parent.owner_id != current_user.id:
            raise HTTPException(status_code=400, detail="Parent folder belongs to another owner")

    duplicate = db.scalar(
        select(Folder).where(
            Folder.owner_id == current_user.id,
            Folder.parent_folder_id == payload.parent_folder_id,
            Folder.name == name,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="A folder with this name already exists here")

    folder = Folder(
        owner_id=current_user.id,
        name=name,
        description=payload.description.strip() if payload.description else None,
        parent_folder_id=payload.parent_folder_id,
    )
    db.add(folder)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A folder with this name already exists here") from exc
    db.refresh(folder)
    return folder


@router.patch("/{folder_id}", response_model=FolderRead)
def update_folder(
    folder_id: int,
    payload: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Folder:
    folder = db.get(Folder, folder_id)
    if folder is None or folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name is required")

    duplicate = db.scalar(
        select(Folder).where(
            Folder.owner_id == current_user.id,
            Folder.parent_folder_id == folder.parent_folder_id,
            Folder.name == name,
            Folder.id != folder.id,
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=409, detail="A folder with this name already exists here")

    folder.name = name
    folder.description = payload.description.strip() if payload.description else None
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A folder with this name already exists here") from exc
    db.refresh(folder)
    return folder


@router.delete("/{folder_id}", status_code=204)
def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    folder = db.get(Folder, folder_id)
    if folder is None or folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder_ids = get_descendant_folder_ids(db, folder_id)
    storage_paths = db.scalars(
        select(Document.storage_path).where(Document.folder_id.in_(folder_ids))
    ).all()

    db.delete(folder)
    db.commit()
    remove_uploaded_files(list(storage_paths))
    return None
