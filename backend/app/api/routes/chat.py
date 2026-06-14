from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.folder import Folder
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.qa import answer_question

router = APIRouter()


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    folder = db.get(Folder, payload.folder_id)
    if folder is None or folder.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")

    payload.user_id = current_user.id
    return answer_question(db, payload)
