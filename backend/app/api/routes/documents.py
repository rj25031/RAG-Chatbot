from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.document import Document
from app.models.folder import Folder
from app.models.user import User
from app.schemas.document import DocumentChunkRead, DocumentDetailRead, DocumentRead
from app.services.folders import get_descendant_folder_ids
from app.services.ingestion import ingest_document

router = APIRouter()


def remove_uploaded_file(storage_path: str) -> None:
    try:
        path = Path(storage_path).resolve()
        path.relative_to(settings.upload_path)
    except (OSError, ValueError):
        return
    if path.is_file():
        path.unlink(missing_ok=True)


def serialize_document(document: Document) -> DocumentRead:
    payload = DocumentRead.model_validate(document).model_dump(exclude={"folder_name"})
    return DocumentRead(
        **payload,
        folder_name=document.folder.name if document.folder else None,
    )


@router.get("/detail/{document_id}", response_model=DocumentDetailRead)
def get_document_detail(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentDetailRead:
    document = db.scalar(
        select(Document)
        .options(selectinload(Document.chunks), selectinload(Document.folder))
        .where(Document.id == document_id)
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.folder is None or document.folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    folder_path: list[str] = []
    current_folder = document.folder
    while current_folder is not None:
        folder_path.append(current_folder.name)
        current_folder = current_folder.parent
    folder_path.reverse()

    citations = sorted(
        document.chunks,
        key=lambda chunk: (chunk.page_number, chunk.chunk_index),
    )

    return DocumentDetailRead(
        **serialize_document(document).model_dump(),
        folder_path=folder_path,
        citations=[DocumentChunkRead.model_validate(chunk) for chunk in citations[:24]],
    )


@router.get("/{folder_id}", response_model=list[DocumentRead])
def list_documents(
    folder_id: int,
    recursive: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentRead]:
    folder = db.get(Folder, folder_id)
    if folder is None or folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder_ids = get_descendant_folder_ids(db, folder_id) if recursive else [folder_id]
    documents = db.scalars(
        select(Document)
        .options(selectinload(Document.folder))
        .where(Document.folder_id.in_(folder_ids))
        .order_by(Document.created_at.desc())
    ).all()
    return [serialize_document(document) for document in documents]


@router.post("/upload", response_model=DocumentRead, status_code=201)
async def upload_document(
    folder_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentRead:
    folder = db.get(Folder, folder_id)
    if folder is None or folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported")

    document = await ingest_document(
        db,
        folder_id=folder_id,
        uploaded_by_user_id=current_user.id,
        upload=file,
    )
    document = db.scalar(
        select(Document)
        .options(selectinload(Document.folder))
        .where(Document.id == document.id)
    )
    if document is None:
        raise HTTPException(status_code=500, detail="Document was not saved")
    return serialize_document(document)


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    document = db.scalar(
        select(Document)
        .options(selectinload(Document.folder))
        .where(Document.id == document_id)
    )
    if document is None or document.folder is None or document.folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = document.storage_path
    db.delete(document)
    db.commit()
    remove_uploaded_file(storage_path)
    return None
