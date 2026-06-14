from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    AuthResponse,
    UserLogin,
    UserPasswordUpdate,
    UserProfileUpdate,
    UserRegister,
    UserRead,
)
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_user,
    update_user_password,
    update_user_profile,
)

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> AuthResponse:
    user = create_user(db, payload)
    return AuthResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    user = authenticate_user(db, payload)
    return AuthResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))

@router.get("/me", response_model=UserRead)
def current_user(user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/me/profile", response_model=UserRead)
def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserRead:
    user = update_user_profile(db, current_user.id, payload)
    return UserRead.model_validate(user)


@router.patch("/me/password", status_code=204)
def update_password(
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    update_user_password(db, current_user.id, payload)
