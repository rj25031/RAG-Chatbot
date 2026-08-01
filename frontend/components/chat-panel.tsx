"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FilePenLine,
  FileText,
  FolderOpen,
  History,
  MessageSquareText,
  Plus,
  Quote,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

import {
  askQuestion,
  deleteAllConversations,
  deleteConversation,
  fetchConversationDetail,
  fetchConversations,
  fetchDocuments,
  fetchFolders,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ConversationListSkeleton,
  MessageSkeleton,
  Spinner,
} from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import { getSelectedModel } from "@/lib/session";
import type {
  Conversation,
  ConversationDetail,
  DocumentItem,
  FolderNode,
  Message,
  User,
} from "@/types";
import { cn } from "@/lib/utils";

function flattenFolders(
  nodes: FolderNode[],
  prefix = "",
): Array<{ id: number; label: string }> {
  return nodes.flatMap((node) => {
    const label = prefix ? `${prefix} / ${node.name}` : node.name;
    return [{ id: node.id, label }, ...flattenFolders(node.children, label)];
  });
}

function formatTime(value: string | null) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleString();
}

function markdownClassName(role: Message["role"]) {
  return cn(
    "overflow-x-auto break-words text-[14px] leading-7 sm:text-[15px] sm:leading-8",
    role === "user" ? "text-ink" : "text-ink [&_.sd-prose]:bg-transparent",
  );
}

function findMessageIndex(messages: Message[], messageId: number) {
  const index = messages.findIndex((message) => message.id === messageId);
  return index === -1 ? messages.length : index;
}

type ConfirmationState =
  | {
      kind: "single";
      conversation: Conversation;
    }
  | {
      kind: "all";
      folderId: number;
    }
  | null;

function ConfirmationDialog({
  state,
  isPending,
  onClose,
  onConfirm,
}: {
  state: ConfirmationState;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  const isDeleteAll = state.kind === "all";
  const title = isDeleteAll
    ? "Delete folder conversations?"
    : "Delete conversation?";
  const description = isDeleteAll
    ? "This will permanently remove every chat in the selected folder."
    : `This will permanently remove "${state.conversation.title}" and all of its messages.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff5f5] text-[#b42318]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="confirmation-title" className="text-base font-semibold text-ink">
                {title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-black/60">{description}</p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/5 hover:text-ink"
            onClick={onClose}
            type="button"
            disabled={isPending}
            aria-label="Close confirmation dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            className="h-10 rounded-lg border border-black/10 px-4"
            variant="ghost"
            onClick={onClose}
            type="button"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            className="h-10 rounded-lg bg-[#b42318] px-4 text-white hover:bg-[#9f1f16]"
            onClick={onConfirm}
            type="button"
            loading={isPending}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null,
  );
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [expandedCitationIds, setExpandedCitationIds] = useState<Set<number>>(
    new Set(),
  );
  const [sendingMessageId, setSendingMessageId] = useState<number | "composer" | null>(null);
  const [pendingNewChat, setPendingNewChat] = useState<{
    userContent: string;
    assistantContent: string;
  } | null>(null);
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);

  const foldersQuery = useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
  });

  const documentsQuery = useQuery({
    queryKey: ["documents", selectedFolderId, "chat-scope"],
    queryFn: () => fetchDocuments(selectedFolderId as number),
    enabled: Boolean(selectedFolderId),
  });

  const conversationsQuery = useQuery({
    queryKey: ["conversations", user.id],
    queryFn: fetchConversations,
  });

  const conversationDetailQuery = useQuery({
    queryKey: ["conversation", selectedConversationId],
    queryFn: () => fetchConversationDetail(selectedConversationId as number),
    enabled: Boolean(selectedConversationId),
  });

  const folderOptions = useMemo(
    () => flattenFolders(foldersQuery.data ?? []),
    [foldersQuery.data],
  );
  const documentOptions = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );

  useEffect(() => {
    if (!selectedFolderId && folderOptions[0]) {
      setSelectedFolderId(folderOptions[0].id);
    }
  }, [folderOptions, selectedFolderId]);

  useEffect(() => {
    setSelectedDocumentId(null);
    setEditingMessageId(null);
    setEditDraft("");
  }, [selectedFolderId]);

  useEffect(() => {
    setEditingMessageId(null);
    setEditDraft("");
  }, [selectedConversationId]);

  useEffect(() => {
    if (!historyOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [historyOpen]);

  useEffect(() => {
    const saved = window.localStorage.getItem("kb-chat-history-collapsed");
    if (saved === "true") setHistoryCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "kb-chat-history-collapsed",
      String(historyCollapsed),
    );
  }, [historyCollapsed]);

  const visibleConversations = useMemo(
    () =>
      (conversationsQuery.data ?? []).filter((item) =>
        selectedFolderId ? item.folder_id === selectedFolderId : true,
      ),
    [conversationsQuery.data, selectedFolderId],
  );

  useEffect(() => {
    if (
      selectedConversationId &&
      !visibleConversations.some(
        (conversation) => conversation.id === selectedConversationId,
      )
    ) {
      setSelectedConversationId(null);
    }
  }, [selectedConversationId, visibleConversations]);

  const mutation = useMutation({
    mutationFn: ({
      content,
      editMessageId,
    }: {
      content: string;
      editMessageId: number | null;
    }) =>
      askQuestion({
        folder_id: selectedFolderId as number,
        document_id: selectedDocumentId,
        question: content,
        conversation_id: selectedConversationId,
        edit_message_id: editMessageId,
        model: getSelectedModel(),
      }),
    onMutate: async ({ content, editMessageId }) => {
      const trimmedContent = content.trim();
      setSendingMessageId(editMessageId ?? "composer");

      if (!selectedConversationId) {
        setPendingNewChat({
          userContent: trimmedContent,
          assistantContent: "Thinking...",
        });
        return { previousConversation: null as ConversationDetail | null };
      }

      setPendingNewChat(null);
      await queryClient.cancelQueries({
        queryKey: ["conversation", selectedConversationId],
      });

      const previousConversation = queryClient.getQueryData<ConversationDetail>([
        "conversation",
        selectedConversationId,
      ]) ?? null;

      if (previousConversation) {
        const editIndex =
          editMessageId == null
            ? previousConversation.messages.length
            : findMessageIndex(previousConversation.messages, editMessageId);
        const baseMessages =
          editMessageId == null
            ? previousConversation.messages
            : previousConversation.messages.slice(0, editIndex);

        const tempBaseId = Date.now();
        queryClient.setQueryData<ConversationDetail>(
          ["conversation", selectedConversationId],
          {
            ...previousConversation,
            messages: [
              ...baseMessages,
              {
                id: -tempBaseId,
                role: "user",
                content: trimmedContent,
                citations: null,
                source_count: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: -(tempBaseId + 1),
                role: "assistant",
                content: "Thinking...",
                citations: [],
                source_count: 0,
                created_at: new Date().toISOString(),
              },
            ],
          },
        );
      }

      return {
        previousConversation,
        editIndex:
          editMessageId == null || !previousConversation
            ? null
            : findMessageIndex(previousConversation.messages, editMessageId),
      };
    },
    onSuccess: async (data, variables, context) => {
      setQuestion("");
      setEditingMessageId(null);
      setEditDraft("");
      setSendingMessageId(null);
      setPendingNewChat(null);
      setSelectedConversationId(data.conversation_id);

      queryClient.setQueryData<ConversationDetail | undefined>(
        ["conversation", data.conversation_id],
        (previousConversation) => {
          const existingMessages = previousConversation?.messages ?? [];
          const nextMessages =
            variables.editMessageId == null
              ? selectedConversationId
                ? [
                    ...existingMessages.slice(0, Math.max(existingMessages.length - 2, 0)),
                    data.user_message,
                    data.assistant_message,
                  ]
                : [data.user_message, data.assistant_message]
              : [
                  ...existingMessages.slice(0, context?.editIndex ?? existingMessages.length),
                  data.user_message,
                  data.assistant_message,
                ];

          return {
            id: previousConversation?.id ?? data.conversation_id,
            user_id: previousConversation?.user_id ?? user.id,
            folder_id: previousConversation?.folder_id ?? (selectedFolderId as number),
            title:
              previousConversation?.title ??
              data.user_message.content.trim().slice(0, 80) ??
              "New chat",
            summary: previousConversation?.summary ?? null,
            last_message_at: data.assistant_message.created_at,
            created_at:
              previousConversation?.created_at ?? data.user_message.created_at,
            updated_at: data.assistant_message.created_at,
            messages: nextMessages,
          };
        },
      );

      queryClient.setQueryData<Conversation[]>(
        ["conversations", user.id],
        (previousConversations = []) => {
          const conversationTitle = data.user_message.content.trim().slice(0, 80) || "New chat";
          const nextItem: Conversation = {
            id: data.conversation_id,
            user_id: user.id,
            folder_id: selectedFolderId as number,
            title:
              previousConversations.find((item) => item.id === data.conversation_id)?.title ??
              conversationTitle,
            summary:
              previousConversations.find((item) => item.id === data.conversation_id)?.summary ??
              null,
            last_message_at: data.assistant_message.created_at,
            created_at:
              previousConversations.find((item) => item.id === data.conversation_id)?.created_at ??
              data.user_message.created_at,
            updated_at: data.assistant_message.created_at,
          };

          return [
            nextItem,
            ...previousConversations.filter((item) => item.id !== data.conversation_id),
          ];
        },
      );
    },
    onError: (error, _variables, context) => {
      setSendingMessageId(null);
      setPendingNewChat(null);
      if (selectedConversationId && context?.previousConversation) {
        queryClient.setQueryData(
          ["conversation", selectedConversationId],
          context.previousConversation,
        );
      }
      toast.error(error.message);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<Conversation[]>(
        ["conversations", user.id],
        (previousConversations = []) =>
          previousConversations.filter((item) => item.id !== conversationId),
      );
      queryClient.removeQueries({ queryKey: ["conversation", conversationId] });
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        setEditingMessageId(null);
        setEditDraft("");
      }
      setConfirmationState(null);
      toast.success("Conversation deleted.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAllConversationsMutation = useMutation({
    mutationFn: deleteAllConversations,
    onSuccess: (_data, folderId) => {
      queryClient.setQueryData<Conversation[]>(
        ["conversations", user.id],
        (previousConversations = []) =>
          previousConversations.filter((item) => item.folder_id !== folderId),
      );
      queryClient.removeQueries({ queryKey: ["conversation"] });
      setSelectedConversationId(null);
      setEditingMessageId(null);
      setEditDraft("");
      setConfirmationState(null);
      toast.success("Folder conversations deleted.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const messages = useMemo(() => {
    const loaded = conversationDetailQuery.data?.messages ?? [];
    if (loaded.length > 0 || !pendingNewChat) {
      return loaded;
    }
    const now = new Date().toISOString();
    return [
      {
        id: -1,
        role: "user" as const,
        content: pendingNewChat.userContent,
        citations: null,
        source_count: 0,
        created_at: now,
      },
      {
        id: -2,
        role: "assistant" as const,
        content: pendingNewChat.assistantContent,
        citations: [],
        source_count: 0,
        created_at: now,
      },
    ];
  }, [conversationDetailQuery.data?.messages, pendingNewChat]);
  const selectedDocument =
    documentOptions.find((item) => item.id === selectedDocumentId) ?? null;
  const selectedFolderLabel =
    folderOptions.find((folder) => folder.id === selectedFolderId)?.label ??
    "Folder";
  const selectedDocumentLabel = selectedDocument
    ? selectedDocument.original_filename
    : "All PDFs";

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Message copied.");
    } catch {
      toast.error("Could not copy message.");
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditDraft(message.content);
  };

  const toggleCitations = (messageId: number) => {
    setExpandedCitationIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSendNewMessage = () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    mutation.mutate({ content: trimmedQuestion, editMessageId: null });
  };

  const handleSubmitEdit = (messageId: number) => {
    const trimmedDraft = editDraft.trim();
    if (!trimmedDraft) return;
    mutation.mutate({ content: trimmedDraft, editMessageId: messageId });
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    setConfirmationState({ kind: "single", conversation });
  };

  const handleDeleteAllConversations = () => {
    if (!selectedFolderId) return;
    setConfirmationState({ kind: "all", folderId: selectedFolderId });
  };

  const handleConfirmDelete = () => {
    if (!confirmationState) return;
    if (confirmationState.kind === "all") {
      deleteAllConversationsMutation.mutate(confirmationState.folderId);
      return;
    }
    deleteConversationMutation.mutate(confirmationState.conversation.id);
  };

  return (
    <section className="relative flex h-full min-h-0">
      <ConfirmationDialog
        state={confirmationState}
        isPending={
          deleteConversationMutation.isPending ||
          deleteAllConversationsMutation.isPending
        }
        onClose={() => setConfirmationState(null)}
        onConfirm={handleConfirmDelete}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#f7f7f8]">
        <div className="border-b border-black/8 bg-white/82 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="hidden text-[10px] uppercase tracking-[0.28em] text-black/45 sm:block">
                  Conversation Workspace
                </p>
                <h3 className="truncate text-sm font-semibold text-ink sm:mt-0.5 sm:text-base">
                  Chat with your knowledge base
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <Button
                  className={cn(
                    "h-8 rounded-lg border px-2.5 text-xs md:hidden",
                    scopeOpen
                      ? "border-[#171717] bg-[#171717] text-white hover:bg-[#171717]"
                      : "border-black/10 hover:bg-black hover:text-white",
                  )}
                  variant="ghost"
                  onClick={() => setScopeOpen((open) => !open)}
                  type="button"
                  aria-expanded={scopeOpen}
                  aria-controls="chat-scope-panel"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Scope</span>
                  <ChevronDown
                    className={cn(
                      "ml-1 h-3.5 w-3.5 transition-transform duration-200",
                      scopeOpen && "rotate-180",
                    )}
                  />
                </Button>
                <Button
                  className={cn(
                    "h-8 rounded-lg border px-2.5 text-xs",
                    !historyCollapsed
                      ? "border-[#171717] bg-[#171717] text-white hover:bg-[#171717]/90] max-xl:border-black/10 max-xl:bg-transparent max-xl:text-ink max-xl:hover:bg-black max-xl:hover:text-white"
                      : "border-black/10 hover:bg-black hover:text-white",
                  )}
                  variant="ghost"
                  onClick={() => {
                    if (window.matchMedia("(min-width: 1280px)").matches) {
                      setHistoryCollapsed((value) => !value);
                      return;
                    }
                    setHistoryOpen(true);
                  }}
                  type="button"
                  aria-expanded={!historyCollapsed}
                  title={
                    historyCollapsed
                      ? "Show recent conversations"
                      : "Hide recent conversations"
                  }
                >
                  <History className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">History</span>
                </Button>
                <Button
                  className="h-8 rounded-lg border border-black/10 px-2.5 text-xs hover:bg-black hover:text-white"
                  variant="ghost"
                  onClick={() => {
                    setSelectedConversationId(null);
                    setEditingMessageId(null);
                    setQuestion("");
                    setPendingNewChat(null);
                  }}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">New</span>
                </Button>
              </div>
            </div>

            {/* Mobile: compact summary chip when scope is collapsed */}
            <button
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-lg border border-black/8 bg-[#f7f7f8] px-2.5 py-1.5 text-left transition md:hidden",
                scopeOpen && "hidden",
              )}
              onClick={() => setScopeOpen(true)}
              type="button"
            >
              <FolderOpen className="h-3.5 w-3.5 shrink-0 text-black/45" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-black/65">
                <span className="font-medium text-ink">{selectedFolderLabel}</span>
                <span className="text-black/35"> · </span>
                <span>{selectedDocumentLabel}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-black/40" />
            </button>

            {/* Scope dropdowns: always on desktop, slide panel on mobile */}
            <div
              id="chat-scope-panel"
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out md:grid md:grid-rows-[1fr] md:opacity-100",
                scopeOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0 md:opacity-100",
              )}
            >
              <div className="min-h-0">
                <div className="grid grid-cols-1 gap-1.5 pb-0.5 sm:grid-cols-2 md:gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2 py-1 shadow-sm">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-black/40" />
                    <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wider text-black/40 sm:inline">
                      Folder
                    </span>
                    <div className="relative min-w-0 flex-1">
                      <select
                        className="h-7 w-full appearance-none rounded-md border-0 bg-transparent py-0 pl-0 pr-6 text-xs outline-none focus:ring-0 disabled:opacity-60"
                        value={selectedFolderId ?? ""}
                        disabled={foldersQuery.isLoading}
                        onChange={(event) => {
                          setSelectedFolderId(Number(event.target.value));
                          setSelectedConversationId(null);
                        }}
                        aria-label="Folder"
                      >
                        {foldersQuery.isLoading ? (
                          <option value="">Loading folders...</option>
                        ) : null}
                        {folderOptions.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.label}
                          </option>
                        ))}
                      </select>
                      {foldersQuery.isLoading ? (
                        <Spinner
                          size="sm"
                          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-black/40"
                        />
                      ) : (
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
                      )}
                    </div>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2 py-1 shadow-sm">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-black/40" />
                    <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wider text-black/40 sm:inline">
                      PDF
                    </span>
                    <div className="relative min-w-0 flex-1">
                      <select
                        className="h-7 w-full appearance-none rounded-md border-0 bg-transparent py-0 pl-0 pr-6 text-xs outline-none focus:ring-0 disabled:opacity-60"
                        value={selectedDocumentId ?? ""}
                        disabled={
                          !selectedFolderId || documentsQuery.isLoading
                        }
                        onChange={(event) =>
                          setSelectedDocumentId(
                            event.target.value
                              ? Number(event.target.value)
                              : null,
                          )
                        }
                        aria-label="PDF"
                      >
                        <option value="">
                          {documentsQuery.isLoading
                            ? "Loading PDFs..."
                            : "All PDFs"}
                        </option>
                        {documentOptions.map((document) => (
                          <option key={document.id} value={document.id}>
                            {document.original_filename}
                          </option>
                        ))}
                      </select>
                      {documentsQuery.isLoading ? (
                        <Spinner
                          size="sm"
                          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-black/40"
                        />
                      ) : (
                        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8">
          {selectedConversationId &&
          conversationDetailQuery.isLoading &&
          messages.length === 0 ? (
            <div className="mx-auto max-w-3xl">
              <MessageSkeleton />
            </div>
          ) : messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-2 text-center">
              {foldersQuery.isLoading ? (
                <>
                  <Spinner size="lg" className="mb-4 text-[#2f6d57]" />
                  <p className="text-sm text-black/55">Loading knowledge base...</p>
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#171717] text-white shadow-lg sm:mb-6 sm:h-16 sm:w-16 sm:rounded-[24px]">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h4 className="text-xl font-semibold text-ink sm:text-2xl md:text-3xl">
                    How can I help with your documents?
                  </h4>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-black/55 sm:mt-3 sm:leading-7">
                    Ask questions against the selected folder tree or narrow the
                    scope to one PDF for more targeted answers.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 pb-6 sm:space-y-8 sm:pb-8">
              {messages.map((message: Message) => (
                <article key={message.id} className="space-y-3">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-4 sm:rounded-[28px] sm:px-5 sm:py-5",
                      message.role === "user"
                        ? "bg-white shadow-sm"
                        : "bg-transparent",
                    )}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-2xl sm:h-10 sm:w-10",
                          message.role === "user"
                            ? "bg-[#171717] text-white"
                            : "bg-[#d8e4dc] text-[#173d31]",
                        )}
                      >
                        {message.role === "user" ? (
                          <MessageSquareText className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize text-ink">
                          {message.role}
                        </p>
                        <p className="text-xs text-black/45">
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button
                          className="h-8 rounded-2xl px-2.5 text-xs sm:px-3"
                          variant="ghost"
                          onClick={() => handleCopyMessage(message.content)}
                          type="button"
                        >
                          <Copy className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Copy</span>
                        </Button>
                        {message.role === "user" ? (
                          <Button
                            className="h-8 rounded-2xl px-2.5 text-xs sm:px-3"
                            variant="ghost"
                            onClick={() => handleEditMessage(message)}
                            type="button"
                            disabled={mutation.isPending}
                          >
                            <FilePenLine className="h-3.5 w-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className={markdownClassName(message.role)}>
                      {message.role === "user" &&
                      editingMessageId === message.id ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editDraft}
                            onChange={(event) =>
                              setEditDraft(event.target.value)
                            }
                            className="min-h-[96px] rounded-2xl border border-black/10 bg-white px-3 py-3 text-[15px] shadow-none sm:px-4"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              className="h-9 rounded-2xl px-4"
                              onClick={() => handleSubmitEdit(message.id)}
                              type="button"
                              loading={
                                mutation.isPending &&
                                sendingMessageId === message.id
                              }
                              disabled={
                                !editDraft.trim() || mutation.isPending
                              }
                            >
                              {sendingMessageId === message.id
                                ? "Sending..."
                                : "Send Edit"}
                            </Button>
                            <Button
                              className="h-9 rounded-2xl px-4"
                              variant="ghost"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditDraft("");
                              }}
                              type="button"
                              disabled={mutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-black/50">
                            This will replace this message and remove all later
                            messages in the chat.
                          </p>
                        </div>
                      ) : message.role === "assistant" ? (
                        message.content === "Thinking..." ? (
                          <div className="flex items-center gap-2 text-black/55">
                            <Spinner size="sm" className="text-[#2f6d57]" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <Streamdown>{message.content}</Streamdown>
                        )
                      ) : (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      )}
                    </div>

                    {message.citations?.length ? (
                      <div className="mt-4 sm:mt-5">
                        <button
                          className="flex items-center gap-2 rounded-2xl border border-[#d8e4dc] bg-white px-3 py-2 text-sm font-medium text-[#2f6d57] transition hover:bg-[#f5fbf8]"
                          onClick={() => toggleCitations(message.id)}
                          type="button"
                        >
                          {expandedCitationIds.has(message.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Quote className="h-4 w-4" />
                          {message.citations.length} citation
                          {message.citations.length > 1 ? "s" : ""}
                        </button>

                        {expandedCitationIds.has(message.id) ? (
                          <div className="mt-3 grid gap-3">
                            {message.citations.map((citation, index) => (
                              <div
                                key={`${message.id}-${index}`}
                                className="rounded-2xl border border-[#d8e4dc] bg-white px-3 py-3 shadow-sm sm:rounded-3xl sm:px-4 sm:py-4"
                              >
                                <div className="mb-2 flex items-center gap-2 text-[#2f6d57]">
                                  <Quote className="h-4 w-4 shrink-0" />
                                  <span className="text-sm font-medium">
                                    {citation.citation_label}
                                  </span>
                                </div>
                                <p className="text-sm leading-6 text-black/70 sm:leading-7">
                                  {citation.quote}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-black/8 bg-white px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-black/10 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.08)] sm:rounded-[30px]">
              <Textarea
                placeholder={
                  selectedFolderId
                    ? "Message the knowledge base"
                    : "Create a folder first to start chatting"
                }
                value={question}
                disabled={!selectedFolderId || mutation.isPending}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-[50px] resize-none border-0 bg-transparent px-3 py-3 text-[15px] shadow-none focus:border-0 sm:min-h-[60px] sm:px-5 sm:py-4"
              />
              <div className="flex items-center justify-between gap-3 border-t border-black/6 px-1 py-1 sm:px-2 sm:py-2">
                <p className="min-w-0 flex-1 truncate text-[11px] text-black/45 sm:text-xs">
                  {selectedDocument
                    ? `Scoped to ${selectedDocument.original_filename}`
                    : "Answers are grounded in indexed PDF chunks."}
                </p>
                <Button
                  className="h-7 w-7 shrink-0 rounded-2xl p-0 sm:h-8 sm:w-8"
                  disabled={
                    !selectedFolderId ||
                    !question.trim() ||
                    mutation.isPending
                  }
                  onClick={handleSendNewMessage}
                  type="button"
                  aria-label={mutation.isPending ? "Sending" : "Send message"}
                >
                  {mutation.isPending && sendingMessageId === "composer" ? (
                    <Spinner size="sm" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {historyOpen ? (
        <button
          className="fixed inset-0 z-40 bg-black/35 xl:hidden"
          onClick={() => setHistoryOpen(false)}
          type="button"
          aria-label="Close chat history"
        />
      ) : null}

      {/* Desktop collapsed rail — always visible expand control */}
      {historyCollapsed ? (
        <div className="hidden h-full w-12 shrink-0 flex-col items-center border-l border-black/8 bg-white py-3 xl:flex">
          <button
            className="flex h-10 w-10 flex-col items-center justify-center gap-0.5 rounded-xl border border-black/10 bg-[#f7f7f8] text-black/70 shadow-sm transition hover:border-[#171717] hover:bg-[#171717] hover:text-white"
            onClick={() => setHistoryCollapsed(false)}
            type="button"
            aria-label="Expand recent conversations"
            title="Show recent conversations"
          >
            <History className="h-4 w-4" />
          </button>
          <p
            className="mt-4 select-none text-[10px] font-medium uppercase tracking-[0.2em] text-black/40"
            style={{ writingMode: "vertical-rl" }}
          >
            History
          </p>
        </div>
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[300px] flex-col border-l border-black/8 bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out xl:static xl:z-auto xl:max-w-none xl:shrink-0 xl:shadow-none",
          historyOpen ? "translate-x-0" : "translate-x-full",
          historyCollapsed
            ? "xl:pointer-events-none xl:absolute xl:w-0 xl:translate-x-0 xl:overflow-hidden xl:border-l-0 xl:opacity-0"
            : "xl:relative xl:w-[300px] xl:translate-x-0 xl:overflow-hidden xl:opacity-100",
        )}
        aria-hidden={historyCollapsed || undefined}
      >
        <div className="w-full min-w-[min(100%,300px)] border-b border-black/8 px-4 py-4 sm:px-5 sm:py-5 xl:min-w-[300px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
                Chat History
              </p>
              <h3 className="mt-1.5 text-base font-semibold text-ink sm:mt-2 sm:text-lg">
                Recent conversations
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/5 hover:text-ink xl:inline-flex"
                onClick={() => setHistoryCollapsed(true)}
                type="button"
                aria-label="Collapse recent conversations"
                title="Collapse"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/5 hover:text-ink xl:hidden"
                onClick={() => setHistoryOpen(false)}
                type="button"
                aria-label="Close chat history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              className="h-9 rounded-lg border border-[#f3c5c5] px-3 text-xs text-[#b42318] hover:bg-[#fff5f5]"
              variant="ghost"
              onClick={handleDeleteAllConversations}
              type="button"
              disabled={
                visibleConversations.length === 0 ||
                deleteAllConversationsMutation.isPending
              }
              title="Delete conversations in this folder"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear all
            </Button>
          </div>
          <p className="mt-2 hidden text-sm text-black/55 sm:block">
            Conversations are grouped by folder; the active ask can be scoped to
            one PDF.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
          <div className="space-y-3">
            {conversationsQuery.isLoading ? (
              <ConversationListSkeleton />
            ) : null}

            {!conversationsQuery.isLoading
              ? visibleConversations.map((conversation: Conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "group flex w-full items-start gap-2 rounded-2xl border px-3 py-3 text-left transition sm:rounded-3xl sm:px-4 sm:py-4",
                      selectedConversationId === conversation.id
                        ? "border-[#171717] bg-[#171717] text-white"
                        : "border-black/8 bg-[#f7f7f8] text-ink hover:border-black/12 hover:bg-white",
                    )}
                  >
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSelectedConversationId(conversation.id);
                        setHistoryOpen(false);
                      }}
                      type="button"
                    >
                      <p className="line-clamp-2 text-sm font-medium">
                        {conversation.title}
                      </p>
                      {conversation.summary ? (
                        <p className="mt-2 line-clamp-2 text-xs opacity-70">
                          {conversation.summary}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs opacity-60">
                        {formatTime(conversation.last_message_at)}
                      </p>
                    </button>
                    <button
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                        selectedConversationId === conversation.id
                          ? "text-white/70 hover:bg-white/12 hover:text-white"
                          : "text-black/35 hover:bg-[#fff5f5] hover:text-[#b42318]",
                      )}
                      onClick={() => handleDeleteConversation(conversation)}
                      type="button"
                      disabled={deleteConversationMutation.isPending}
                      title="Delete conversation"
                    >
                      {deleteConversationMutation.isPending &&
                      confirmationState?.kind === "single" &&
                      confirmationState.conversation.id === conversation.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))
              : null}

            {!conversationsQuery.isLoading &&
            visibleConversations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#f7f7f8] px-4 py-5 text-sm text-black/55 sm:rounded-3xl">
                No conversations yet for this folder.
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </section>
  );
}

