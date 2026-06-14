from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.settings import GroqModelListResponse, GroqModelRead
from app.services.llm import get_default_model, list_groq_models

router = APIRouter()


@router.get("/models", response_model=GroqModelListResponse)
def groq_models(_current_user: User = Depends(get_current_user)) -> GroqModelListResponse:
    try:
        return GroqModelListResponse(
            current_model=get_default_model(),
            models=[GroqModelRead(**model) for model in list_groq_models()],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Unable to fetch Groq models right now") from exc
