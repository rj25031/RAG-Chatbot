"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Bot,
  ChevronDown,
  ChevronRight,
  Copy,
  FilePenLine,
  FileText,
  FolderOpen,
  MessageSquareText,
  Plus,
  Quote,
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
    "text-[15px] leading-8",
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
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff5f5] text-[#b42318]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
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

        <div className="mt-5 flex justify-end gap-2">
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
            disabled={isPending}
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
  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState>(null);

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
        return { previousConversation: null as ConversationDetail | null };
      }

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

  const messages = conversationDetailQuery.data?.messages ?? [];
  const selectedDocument =
    documentOptions.find((item) => item.id === selectedDocumentId) ?? null;

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
    <section className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ConfirmationDialog
        state={confirmationState}
        isPending={
          deleteConversationMutation.isPending ||
          deleteAllConversationsMutation.isPending
        }
        onClose={() => setConfirmationState(null)}
        onConfirm={handleConfirmDelete}
      />
      <div className="flex min-h-0 flex-col bg-[#f7f7f8]">
        <div className="border-b border-black/8 bg-white/82 px-4 py-3">
          <div className="flex justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-black/45">
                Conversation Workspace
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-ink">
                Chat with your knowledge base
              </h3>
            </div>

            <div className=" grid gap-3 xl:grid-cols-[1fr_1fr_auto]">
              
              <div className="rounded-lg border border-black/10 bg-white p-2 shadow-sm">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-black/45">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Folder
                </div>

                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-[#f8f8f8] px-3 pr-9 text-sm transition-all outline-none hover:border-black/20 focus:border-black/30 focus:bg-white"
                    value={selectedFolderId ?? ""}
                    onChange={(event) => {
                      setSelectedFolderId(Number(event.target.value));
                      setSelectedConversationId(null);
                    }}
                  >
                    {folderOptions.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.label}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white p-2 shadow-sm">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-black/45">
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </div>

                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-lg border border-black/10 bg-[#f8f8f8] px-3 pr-9 text-sm transition-all outline-none hover:border-black/20 focus:border-black/30 focus:bg-white"
                    value={selectedDocumentId ?? ""}
                    onChange={(event) =>
                      setSelectedDocumentId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">All PDFs</option>

                    {documentOptions.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.original_filename}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                </div>
              </div>

              <Button
                className="h-10 rounded-lg border border-black/10 px-4 hover:bg-black hover:text-white"
                variant="ghost"
                onClick={() => {
                  setSelectedConversationId(null);
                  setEditingMessageId(null);
                  setQuestion("");
                }}
                type="button"
              >
                <Plus className="mr-2 h-4 w-4" />
                New chat
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#171717] text-white shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <h4 className="text-3xl font-semibold text-ink">
                How can I help with your documents?
              </h4>
              <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">
                Ask questions against the selected folder tree or narrow the
                scope to one PDF for more targeted answers.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8 pb-8">
              {messages.map((message: Message) => (
                <article key={message.id} className="space-y-3">
                  <div
                    className={cn(
                      "rounded-[28px] px-5 py-5",
                      message.role === "user"
                        ? "bg-white shadow-sm"
                        : "bg-transparent",
                    )}
                  >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
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
                    <div>
                      <p className="font-medium capitalize text-ink">
                        {message.role}
                      </p>
                      <p className="text-xs text-black/45">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        className="h-8 rounded-2xl px-3 text-xs"
                        variant="ghost"
                        onClick={() => handleCopyMessage(message.content)}
                        type="button"
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy
                      </Button>
                      {message.role === "user" ? (
                        <Button
                          className="h-8 rounded-2xl px-3 text-xs"
                          variant="ghost"
                          onClick={() => handleEditMessage(message)}
                          type="button"
                          disabled={mutation.isPending}
                        >
                          <FilePenLine className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className={markdownClassName(message.role)}>
                    {message.role === "user" && editingMessageId === message.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editDraft}
                          onChange={(event) => setEditDraft(event.target.value)}
                          className="min-h-[96px] rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] shadow-none"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            className="h-9 rounded-2xl px-4"
                            onClick={() => handleSubmitEdit(message.id)}
                            type="button"
                            disabled={!editDraft.trim() || mutation.isPending}
                          >
                            {sendingMessageId === message.id ? "Sending..." : "Send Edit"}
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
                          This will replace this message and remove all later messages in the chat.
                        </p>
                      </div>
                    ) : message.role === "assistant" ? (
                      <Streamdown>{message.content}</Streamdown>
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>

                  {message.citations?.length ? (
                    <div className="mt-5">
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
                              className="rounded-3xl border border-[#d8e4dc] bg-white px-4 py-4 shadow-sm"
                            >
                              <div className="mb-2 flex items-center gap-2 text-[#2f6d57]">
                                <Quote className="h-4 w-4" />
                                <span className="text-sm font-medium">
                                  {citation.citation_label}
                                </span>
                              </div>
                              <p className="text-sm leading-7 text-black/70">
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

        <div className="border-t border-black/8 bg-white px-4 py-4 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-[30px] border border-black/10 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.08)]">
              <Textarea
                placeholder={
                  selectedFolderId
                    ? "Message the knowledge base"
                    : "Create a folder first to start chatting"
                }
                value={question}
                disabled={!selectedFolderId || mutation.isPending}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-[100px] resize-none border-0 bg-transparent px-5 py-4 text-[15px] shadow-none focus:border-0"
              />
              <div className="flex items-center justify-between border-t border-black/6 px-4 py-3">
                <p className="text-xs text-black/45">
                  {selectedDocument
                    ? `Scoped to ${selectedDocument.original_filename}`
                    : "Answers are grounded in indexed PDF chunks. Citations stay hidden until opened."}
                </p>
                <Button
                  className="h-11 w-11 rounded-2xl p-0"
                  disabled={
                    !selectedFolderId ||
                    !question.trim() ||
                    mutation.isPending
                  }
                  onClick={handleSendNewMessage}
                  type="button"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-l border-black/8 bg-white">
        <div className="border-b border-black/8 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.28em] text-black/45">
            Chat History
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-ink">
              Recent conversations
            </h3>
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
          <p className="mt-2 text-sm text-black/55">
            Conversations are still grouped by folder, while the active ask can
            be scoped to one PDF.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {visibleConversations.map((conversation: Conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group flex w-full items-start gap-2 rounded-3xl border px-4 py-4 text-left transition",
                  selectedConversationId === conversation.id
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-black/8 bg-[#f7f7f8] text-ink hover:border-black/12 hover:bg-white",
                )}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelectedConversationId(conversation.id)}
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
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {!conversationsQuery.isLoading &&
            visibleConversations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 bg-[#f7f7f8] px-4 py-5 text-sm text-black/55">
                No conversations yet for this folder.
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </section>
  );
}
