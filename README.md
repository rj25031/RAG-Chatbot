# RAG Chatbot

A beginner-friendly full-stack AI app for uploading PDFs, organizing them into nested folders, and chatting with them using Retrieval-Augmented Generation (RAG).

This monorepo contains:

- `frontend`: Next.js 15 + React 19 + TypeScript + Tailwind + TanStack Query
- `backend`: FastAPI + SQLAlchemy + Alembic + PostgreSQL/pgvector + LangGraph + Groq

## 1. What This App Does

The app lets a user:

- register and log in with JWT-based auth
- create, rename, and delete nested folders
- upload PDF files into folders
- delete uploaded PDFs
- extract, chunk, and embed PDF content
- search relevant chunks with vector similarity
- ask questions against a folder tree or a single document
- receive citation-grounded answers
- edit older user prompts and regenerate the conversation from that point
- choose a Groq model from the settings page

## 2. High-Level Architecture

```mermaid
flowchart LR
    A["Next.js Frontend"] --> B["FastAPI API"]
    B --> C["PostgreSQL + pgvector"]
    B --> D["Cohere Embeddings"]
    B --> E["Groq API"]
    B --> F["uploads/ PDF Storage"]
```

### Responsibilities by layer

- Frontend
  - authentication UI
  - document upload and browsing
  - chat interface
  - settings and model selection
  - stores JWT + current user + selected model in browser storage

- Backend
  - JWT auth and protected APIs
  - folder/document/conversation persistence
  - PDF ingestion pipeline
  - embedding creation
  - vector retrieval
  - Groq-powered answer generation

## 3. Project Structure

```text
RAG-chatbot/
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   `-- types/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |-- core/
|   |   |-- db/
|   |   |-- langgraph/
|   |   |-- models/
|   |   |-- schemas/
|   |   `-- services/
|   `-- alembic/
|-- uploads/
|-- docker-compose.yml
`-- README.md
```

## 4. Frontend Overview

### Main pages

- `frontend/app/login/page.tsx`
- `frontend/app/register/page.tsx`
- `frontend/app/documents/page.tsx`
- `frontend/app/chat/page.tsx`
- `frontend/app/settings/page.tsx`

### Important components

- `components/app-shell.tsx`
  - main layout and sidebar

- `components/auth-form.tsx`
  - shared login/register form

- `components/auth-guard.tsx`
  - redirects unauthenticated users
  - restores user session from JWT-backed frontend state

- `components/documents-workspace.tsx`
  - folder creation
  - folder rename and delete controls
  - PDF uploads
  - PDF delete controls
  - document browsing
  - in-app confirmation dialogs for destructive actions

- `components/chat-panel.tsx`
  - conversation history
  - markdown rendering with `streamdown`
  - inline edit / copy / citations

### Important frontend utilities

- `frontend/lib/api.ts`
  - all HTTP calls
  - adds `Authorization: Bearer <token>` automatically

- `frontend/lib/session.ts`
  - stores:
    - current user
    - JWT access token
    - selected Groq model

## 5. Backend Overview

### API routes

- `app/api/routes/users.py`
  - register
  - login
  - get current user
  - update profile
  - update password

- `app/api/routes/folders.py`
  - list folders for the authenticated user
  - create folders for the authenticated user
  - rename folders for the authenticated user
  - delete folders and their child folders/documents/conversations

- `app/api/routes/documents.py`
  - upload PDF
  - list PDFs in a folder tree
  - fetch document detail
  - delete PDFs and their indexed chunks

- `app/api/routes/conversations.py`
  - list conversations
  - fetch conversation detail

- `app/api/routes/chat.py`
  - run the RAG question-answer flow

- `app/api/routes/settings.py`
  - fetch available Groq models

### Core services

- `services/auth.py`
  - password hashing
  - JWT creation
  - login/register/profile/password logic

- `services/ingestion.py`
  - saves uploaded files
  - extracts PDF text
  - chunks content
  - embeds chunks
  - stores chunk vectors

- `services/retriever.py`
  - vector similarity search with pgvector

- `services/qa.py`
  - main RAG orchestration

- `services/llm.py`
  - Groq client
  - model listing
  - answer generation

- `services/conversations.py`
  - create/list conversations
  - append messages
  - truncate from edited user messages

### Important backend data models

- `User`
- `Folder`
- `Document`
- `DocumentChunk`
- `Conversation`
- `Message`

## 6. Auth Architecture

The app now uses JWT-based auth for both frontend and backend.

### Backend auth flow

1. User logs in or registers.
2. Backend validates credentials.
3. Backend returns:
   - `access_token`
   - `token_type`
   - `user`
4. Protected routes use a bearer token dependency to resolve the current user.

### Frontend auth flow

1. Login/register stores:
   - JWT token
   - current user
2. Every API request attaches:

```http
Authorization: Bearer <token>
```

3. Protected UI loads the saved user session and can re-fetch `/users/me`.

### Important note

This is much better than the earlier local-only auth approach, but it is still a simple learning-friendly implementation.

Passwords are hashed with **bcrypt**. Legacy unsalted SHA-256 hashes are still verified on login and upgraded to bcrypt automatically.

For production, you would usually add:

- refresh tokens
- token rotation
- secure cookie-based auth if appropriate
- rate limiting on login/register

## 7. RAG Data Flow

### PDF ingestion flow

1. User uploads a PDF.
2. Backend saves the file in `uploads/`.
3. Backend extracts PDF text.
4. Backend splits text into chunks.
5. Backend creates embeddings.
6. Backend stores chunks and vectors in PostgreSQL.

### Delete flow

1. User clicks delete on a folder or document.
2. Frontend shows an in-app confirmation dialog.
3. For a document delete, the backend removes:
   - the `Document`
   - its `DocumentChunk` rows
   - the uploaded PDF file from `uploads/`
4. For a folder delete, the backend deletes the selected folder subtree:
   - child folders
   - documents and chunks
   - conversations and messages scoped to those folders
   - uploaded PDF files for every document in the subtree

Deleting a root folder therefore deletes every child folder, PDF, and chat under that root.

### Question-answer flow

1. User sends a question.
2. Backend retrieves the most relevant chunks for:
   - the selected folder tree
   - optionally the selected document
3. Backend builds a prompt using:
   - question
   - retrieved context
4. Groq generates the answer.
5. Backend stores user + assistant messages.
6. Frontend renders the assistant answer in markdown.

### Edit message flow

1. User edits an older user message inline.
2. Frontend sends `edit_message_id`.
3. Backend deletes that message and everything after it.
4. Backend regenerates the answer from the edited point.

## 8. Environment Variables

### Backend `.env`

Create `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/rag_chatbot
GROQ_API_KEY=your_groq_api_key
JWT_SECRET_KEY=change_me_to_a_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GROQ_MODEL=openai/gpt-oss-20b
EMBEDDING_MODEL=embed-multilingual-v3.0
COHERE_API_KEY=your_cohere_api_key
COHERE_BASE_URL=https://api.cohere.com/compatibility/v1
UPLOAD_DIR=../uploads
CORS_ORIGINS=http://localhost:3000
MAX_UPLOAD_BYTES=26214400
```

### Frontend `.env.local`

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## 9. Local Development Setup

## Prerequisites

- Node.js
- pnpm
- Python 3.12
- Poetry
- Docker Desktop

### Step 1: Start PostgreSQL with pgvector

```bash
docker compose up -d postgres
```

### Step 2: Start the backend with Poetry

```bash
cd backend
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload --port 8000
```

### Step 3: Start the frontend

```bash
cd frontend
pnpm install
pnpm dev
```

### App URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

## 10. Docker Setup

This repo now includes:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- updated `docker-compose.yml`

### Start the full stack

```bash
docker compose up --build
```

That brings up:

- `postgres`
- `backend`
- `frontend`

### Default ports

- frontend: `3000`
- backend: `8000`
- postgres: `5432`

### Important Docker notes

For Docker Compose, the backend database host is `postgres`, not `localhost`. The compose file already overrides `DATABASE_URL` for the containerized backend.

`NEXT_PUBLIC_API_BASE_URL` is baked into the frontend **at image build time** via Docker build args (not runtime env). Change it under `frontend.build.args` in `docker-compose.yml` and rebuild when the API URL changes.

Backend `.env` must include `COHERE_API_KEY` and `COHERE_BASE_URL` for embeddings.

## 11. Important API Endpoints

### Auth / user

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`
- `PATCH /api/users/me/profile`
- `PATCH /api/users/me/password`

### Folders

- `GET /api/folders`
- `POST /api/folders`
- `PATCH /api/folders/{folder_id}`
- `DELETE /api/folders/{folder_id}`

### Documents

- `POST /api/documents/upload`
- `GET /api/documents/{folder_id}?recursive=true`
- `GET /api/documents/detail/{document_id}`
- `DELETE /api/documents/{document_id}`

### Conversations

- `GET /api/conversations`
- `GET /api/conversations/{conversation_id}`
- `DELETE /api/conversations?folder_id={folder_id}`
- `DELETE /api/conversations/{conversation_id}`

### Chat

- `POST /api/chat`

### Settings

- `GET /api/settings/models`
