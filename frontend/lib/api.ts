import type {
  AuthResponse,
  ChatResponse,
  Conversation,
  ConversationDetail,
  DocumentDetail,
  DocumentItem,
  FolderCreatePayload,
  FolderNode,
  FolderUpdatePayload,
  GroqModelsResponse,
  User,
  UserPasswordUpdatePayload,
  UserProfileUpdatePayload,
} from "@/types";
import { clearCurrentUser, getAccessToken } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

async function extractErrorMessage(response: Response) {
  if (response.status >= 500) {
    return "Internal error. Try again.";
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object") {
      if ("detail" in payload) {
        if (typeof payload.detail === "string") {
          return payload.detail;
        }
        if (Array.isArray(payload.detail)) {
          const messages = payload.detail
            .map((item: { msg?: string }) =>
              typeof item?.msg === "string" ? item.msg : null,
            )
            .filter(Boolean);
          if (messages.length > 0) {
            return messages.join(" ");
          }
        }
      }

      if ("message" in payload && typeof payload.message === "string") {
        return payload.message;
      }
    }
  }

  const errorText = await response.text();
  return errorText || "Request failed";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearCurrentUser();
    }
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function registerUser(payload: { full_name: string; email: string; password: string }) {
  return request<AuthResponse>("/users/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }) {
  return request<AuthResponse>("/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateUserProfile(_userId: number, payload: UserProfileUpdatePayload) {
  return request<User>("/users/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateUserPassword(_userId: number, payload: UserPasswordUpdatePayload) {
  await request<void>("/users/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function fetchGroqModels() {
  return request<GroqModelsResponse>("/settings/models");
}

export function fetchCurrentUser() {
  return request<User>("/users/me");
}

export function fetchFolders() {
  return request<FolderNode[]>("/folders");
}

export function createFolder(payload: FolderCreatePayload) {
  return request<FolderNode>("/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateFolder(folderId: number, payload: FolderUpdatePayload) {
  return request<FolderNode>(`/folders/${folderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteFolder(folderId: number) {
  await request<void>(`/folders/${folderId}`, {
    method: "DELETE",
  });
}

export function fetchDocuments(folderId: number) {
  return request<DocumentItem[]>(`/documents/${folderId}?recursive=true`);
}

export function fetchDocumentDetail(documentId: number) {
  return request<DocumentDetail>(`/documents/detail/${documentId}`);
}

export async function deleteDocument(documentId: number) {
  await request<void>(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function uploadDocument(folderId: number, file: File) {
  const formData = new FormData();
  formData.append("folder_id", String(folderId));
  formData.append("file", file);

  const token = getAccessToken();
  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearCurrentUser();
    }
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<DocumentItem>;
}

export function fetchConversations() {
  return request<Conversation[]>("/conversations");
}

export function fetchConversationDetail(conversationId: number) {
  return request<ConversationDetail>(`/conversations/${conversationId}`);
}

export async function deleteConversation(conversationId: number) {
  await request<void>(`/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export async function deleteAllConversations(folderId: number) {
  await request<void>(`/conversations?folder_id=${folderId}`, {
    method: "DELETE",
  });
}

export function askQuestion(payload: {
  user_id?: number | null;
  folder_id: number;
  document_id?: number | null;
  question: string;
  conversation_id?: number | null;
  edit_message_id?: number | null;
  model?: string | null;
}) {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
