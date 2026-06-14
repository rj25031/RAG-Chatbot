export type User = {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type UserProfileUpdatePayload = {
  full_name: string;
};

export type UserPasswordUpdatePayload = {
  current_password: string;
  new_password: string;
};

export type FolderNode = {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  parent_folder_id: number | null;
  direct_document_count: number;
  total_document_count: number;
  created_at: string;
  updated_at: string;
  children: FolderNode[];
};

export type FolderCreatePayload = {
  name: string;
  description?: string | null;
  parent_folder_id: number | null;
};

export type FolderUpdatePayload = {
  name: string;
  description?: string | null;
};

export type DocumentItem = {
  id: number;
  folder_id: number;
  uploaded_by_user_id: number | null;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  page_count: number;
  status: string;
  summary: string | null;
  folder_name: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentCitation = {
  id: number;
  page_number: number;
  chunk_index: number;
  token_count: number;
  character_count: number;
  content: string;
  citation_label: string;
  created_at: string;
};

export type DocumentDetail = DocumentItem & {
  folder_name: string | null;
  folder_path: string[];
  citations: DocumentCitation[];
};

export type Citation = {
  document_id: number;
  filename: string;
  page_number: number;
  chunk_index: number;
  quote: string;
  citation_label: string;
  score: number;
};

export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  source_count: number;
  created_at: string;
};

export type Conversation = {
  id: number;
  user_id: number;
  folder_id: number;
  title: string;
  summary: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationDetail = Conversation & {
  messages: Message[];
};

export type ChatResponse = {
  conversation_id: number;
  user_message: Message;
  assistant_message: Message;
  answer: string;
  citations: Citation[];
};

export type GroqModel = {
  id: string;
  owned_by: string | null;
  context_window: number | null;
  active: boolean | null;
};

export type GroqModelsResponse = {
  current_model: string;
  models: GroqModel[];
};
