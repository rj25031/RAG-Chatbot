from fastapi import APIRouter

from app.api.routes import chat, conversations, documents, folders, settings, users

api_router = APIRouter()
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(folders.router, prefix="/folders", tags=["folders"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
