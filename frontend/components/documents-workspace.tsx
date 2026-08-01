"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  FileText,
  FolderOpen,
  FolderPlus,
  Folders,
  Home,
  Menu,
  MoveLeft,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  createFolder,
  deleteDocument,
  deleteFolder,
  fetchDocuments,
  fetchFolders,
  updateFolder,
  uploadDocument,
} from "@/lib/api";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DocumentListSkeleton,
  FolderTreeSkeleton,
  SectionLoader,
  Spinner,
} from "@/components/ui/loader";
import type { DocumentItem, FolderNode, User } from "@/types";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function flattenFolders(nodes: FolderNode[]): FolderNode[] {
  return nodes.flatMap((node) => [node, ...flattenFolders(node.children)]);
}

function collectExpandableIds(nodes: FolderNode[]): number[] {
  return nodes.flatMap((node) =>
    node.children.length > 0
      ? [node.id, ...collectExpandableIds(node.children)]
      : collectExpandableIds(node.children),
  );
}

function findFolder(
  nodes: FolderNode[],
  folderId: number | null,
): FolderNode | null {
  if (folderId == null) return null;
  for (const node of nodes) {
    if (node.id === folderId) return node;
    const childMatch = findFolder(node.children, folderId);
    if (childMatch) return childMatch;
  }
  return null;
}

function buildPath(
  nodes: FolderNode[],
  folderId: number | null,
  trail: FolderNode[] = [],
): FolderNode[] {
  if (folderId == null) return [];
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.id === folderId) return nextTrail;
    const childPath = buildPath(node.children, folderId, nextTrail);
    if (childPath.length) return childPath;
  }
  return [];
}

function isFolderInBranch(folder: FolderNode, branchRootId: number): boolean {
  if (folder.id === branchRootId) return true;
  return folder.children.some((child) => isFolderInBranch(child, branchRootId));
}

type DeleteConfirmationState =
  | {
      kind: "folder";
      folder: FolderNode;
    }
  | {
      kind: "document";
      document: DocumentItem;
    }
  | null;

function DeleteConfirmationDialog({
  state,
  isPending,
  onClose,
  onConfirm,
}: {
  state: DeleteConfirmationState;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!state) return null;

  const isFolder = state.kind === "folder";
  const title = isFolder ? "Delete folder?" : "Delete document?";
  const name = isFolder ? state.folder.name : state.document.original_filename;
  const description = isFolder
    ? state.folder.total_document_count > 0 || state.folder.children.length > 0
      ? `This will permanently delete "${name}" and all child folders, PDFs, and chats inside it.`
      : `This will permanently delete "${name}".`
    : `This will permanently delete "${name}" and remove its indexed chunks.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirmation-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff5f5] text-[#b42318]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="delete-confirmation-title"
                className="text-base font-semibold text-ink"
              >
                {title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-black/60">
                {description}
              </p>
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

function FolderNavNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
  expandedIds,
  onToggle,
  onBeginEdit,
  onDelete,
}: {
  node: FolderNode;
  depth: number;
  selectedFolderId: number | null;
  onSelect: (folderId: number) => void;
  expandedIds: Set<number>;
  onToggle: (folderId: number) => void;
  onBeginEdit: (folder: FolderNode) => void;
  onDelete: (folder: FolderNode) => void;
}) {
  const active = selectedFolderId === node.id;
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border px-2.5 py-2 transition",
          active
            ? "border-[#171717] bg-[#171717] text-white"
            : "border-black/8 bg-white text-ink hover:border-black/12 hover:bg-[#f7f7f8]",
        )}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <button
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition",
            active
              ? "text-white/75 hover:bg-white/10"
              : "text-black/45 hover:bg-black/5",
          )}
          disabled={!hasChildren}
          onClick={() => hasChildren && onToggle(node.id)}
          type="button"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>

        <button
          className="flex min-w-0 flex-1 items-center justify-between text-left"
          onClick={() => onSelect(node.id)}
          type="button"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{node.name}</p>
            <p
              className={cn(
                "text-[11px]",
                active ? "text-white/65" : "text-black/45",
              )}
            >
              {node.total_document_count} PDFs
            </p>
          </div>
          {hasChildren ? (
            <span
              className={cn(
                "text-[11px]",
                active ? "text-white/55" : "text-black/35",
              )}
            >
              {node.children.length}
            </span>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={`Edit ${node.name}`}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition",
              active
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-black/40 hover:bg-black/5 hover:text-black/70",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onBeginEdit(node);
            }}
            title="Edit folder"
            type="button"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={`Delete ${node.name}`}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition",
              active
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "text-black/40 hover:bg-black/5 hover:text-red-700",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(node);
            }}
            title="Delete folder"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <FolderNavNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onBeginEdit={onBeginEdit}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

export function DocumentsWorkspace({ user }: { user: User }) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [creationTarget, setCreationTarget] = useState<"root" | "current">(
    "root",
  );
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [hasInitializedExpansion, setHasInitializedExpansion] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmationState>(null);
  const [folderNavOpen, setFolderNavOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const foldersQuery = useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
  });

  const documentsQuery = useQuery({
    queryKey: ["documents", selectedFolderId],
    queryFn: () => fetchDocuments(selectedFolderId as number),
    enabled: Boolean(selectedFolderId),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) =>
      uploadDocument(selectedFolderId as number, file),
    onSuccess: async (document) => {
      toast.success(`"${document.original_filename}" uploaded successfully.`);
      await queryClient.invalidateQueries({
        queryKey: ["documents", selectedFolderId],
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: () =>
      createFolder({
        name: draftName.trim(),
        description: draftDescription.trim() || null,
        parent_folder_id:
          creationTarget === "current" ? selectedFolderId : null,
      }),
    onSuccess: async (folder) => {
      setDraftName("");
      setDraftDescription("");
      toast.success(`Folder "${folder.name}" created.`);
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      setSelectedFolderId(folder.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: () =>
      updateFolder(editingFolderId as number, {
        name: editingName.trim(),
        description: editingDescription.trim() || null,
      }),
    onSuccess: async (folder) => {
      toast.success(`Folder "${folder.name}" updated.`);
      setEditingFolderId(null);
      setEditingName("");
      setEditingDescription("");
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: deleteFolder,
    onSuccess: async (_result, deletedFolderId) => {
      toast.success("Folder deleted.");
      const deletedBranch = flatFolders.find((folder) => folder.id === deletedFolderId);
      const fallbackFolder =
        flatFolders.find((folder) =>
          deletedBranch ? !isFolderInBranch(deletedBranch, folder.id) : folder.id !== deletedFolderId,
        ) ?? null;

      if (
        selectedFolderId === deletedFolderId ||
        (deletedBranch && isFolderInBranch(deletedBranch, selectedFolderId ?? -1))
      ) {
        setSelectedFolderId(fallbackFolder?.id ?? null);
      }
      if (editingFolderId === deletedFolderId) {
        setEditingFolderId(null);
      }
      setDeleteConfirmation(null);
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: async () => {
      toast.success("Document deleted.");
      await queryClient.invalidateQueries({
        queryKey: ["documents", selectedFolderId],
      });
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      setDeleteConfirmation(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const folders = foldersQuery.data ?? [];
  const flatFolders = useMemo(() => flattenFolders(folders), [folders]);
  const expandableIds = useMemo(() => collectExpandableIds(folders), [folders]);
  const selectedFolder = useMemo(
    () => findFolder(folders, selectedFolderId),
    [folders, selectedFolderId],
  );
  const breadcrumbFolders = useMemo(
    () => buildPath(folders, selectedFolderId),
    [folders, selectedFolderId],
  );
  const documents = useMemo(
    () => documentsQuery.data ?? [],
    [documentsQuery.data],
  );
  const childFolders = selectedFolder?.children ?? [];
  const isUploading = uploadMutation.isPending;
  const isCreatingFolder = createFolderMutation.isPending;
  const isEditingSelectedFolder = editingFolderId === selectedFolderId;

  useEffect(() => {
    if (folders.length === 0) {
      if (selectedFolderId !== null) {
        setSelectedFolderId(null);
      }
      return;
    }

    if (!selectedFolderId || !findFolder(folders, selectedFolderId)) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  useEffect(() => {
    if (!hasInitializedExpansion && folders.length > 0) {
      setExpandedIds(
        new Set(
          folders
            .filter((folder) => folder.children.length > 0)
            .map((folder) => folder.id),
        ),
      );
      setHasInitializedExpansion(true);
    }
  }, [hasInitializedExpansion, folders]);

  useEffect(() => {
    if (breadcrumbFolders.length > 0) {
      setExpandedIds((current) => {
        const next = new Set(current);
        breadcrumbFolders.forEach((folder) => {
          if (folder.children.length > 0) next.add(folder.id);
        });
        return next;
      });
    }
  }, [breadcrumbFolders]);

  useEffect(() => {
    if (!folderNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [folderNavOpen]);

  const handleCreateFolder = (event: FormEvent) => {
    event.preventDefault();
    if (!draftName.trim()) return;
    createFolderMutation.mutate();
  };

  const beginFolderEdit = (folder: FolderNode) => {
    setSelectedFolderId(folder.id);
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
    setEditingDescription(folder.description ?? "");
  };

  const handleUpdateFolder = (event: FormEvent) => {
    event.preventDefault();
    if (!editingName.trim() || editingFolderId == null) return;
    updateFolderMutation.mutate();
  };

  const handleDeleteFolder = (folder: FolderNode) => {
    setDeleteConfirmation({ kind: "folder", folder });
  };

  const handleDeleteDocument = (document: DocumentItem) => {
    setDeleteConfirmation({ kind: "document", document });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    if (deleteConfirmation.kind === "folder") {
      deleteFolderMutation.mutate(deleteConfirmation.folder.id);
      return;
    }
    deleteDocumentMutation.mutate(deleteConfirmation.document.id);
  };
  
  const toggleExpanded = (folderId: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  return (
    <section className="relative flex h-full min-h-0">
      <DeleteConfirmationDialog
        state={deleteConfirmation}
        isPending={
          deleteFolderMutation.isPending || deleteDocumentMutation.isPending
        }
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleConfirmDelete}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
        <div className="border-b border-black/8 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
                    Document Explorer
                  </p>
                  <Button
                    variant="ghost"
                    className="h-9 gap-2 rounded-2xl px-3 text-xs xl:hidden"
                    onClick={() => setFolderNavOpen(true)}
                    type="button"
                  >
                    <Menu className="h-4 w-4" />
                    Folders
                  </Button>
                </div>
                {selectedFolder && isEditingSelectedFolder ? (
                  <form
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
                    onSubmit={handleUpdateFolder}
                  >
                    <Input
                      className="py-2"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                    />
                    <Input
                      className="py-2"
                      placeholder="Optional description"
                      value={editingDescription}
                      onChange={(event) =>
                        setEditingDescription(event.target.value)
                      }
                    />
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
                      <Button
                        aria-label="Save folder"
                        className="h-9 w-9 rounded-full p-0"
                        disabled={updateFolderMutation.isPending}
                        title="Save folder"
                        type="submit"
                      >
                        {updateFolderMutation.isPending ? (
                          <Spinner size="sm" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        aria-label="Cancel folder edit"
                        variant="ghost"
                        className="h-9 w-9 rounded-full p-0"
                        onClick={() => setEditingFolderId(null)}
                        title="Cancel"
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-1.5 flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-ink sm:text-lg">
                      {selectedFolder ? selectedFolder.name : "Select a folder"}
                    </h3>
                    {selectedFolder ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          aria-label="Edit selected folder"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-black/75"
                          onClick={() => beginFolderEdit(selectedFolder)}
                          title="Edit folder"
                          type="button"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Delete selected folder"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-red-700"
                          onClick={() => handleDeleteFolder(selectedFolder)}
                          title="Delete folder"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="h-9 gap-2 rounded-2xl px-3"
                  disabled={!selectedFolder?.parent_folder_id}
                  onClick={() =>
                    selectedFolder?.parent_folder_id &&
                    setSelectedFolderId(selectedFolder.parent_folder_id)
                  }
                  type="button"
                >
                  <MoveLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 rounded-2xl px-3"
                  disabled={folders.length === 0}
                  onClick={() =>
                    folders[0] && setSelectedFolderId(folders[0].id)
                  }
                  type="button"
                >
                  <Home className="h-4 w-4" />
                  Root
                </Button>
                <label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={!selectedFolderId || isUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadMutation.mutate(file);
                        event.currentTarget.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    className="h-9 gap-2 rounded-2xl px-3"
                    disabled={!selectedFolderId || isUploading}
                    loading={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {!isUploading ? <UploadCloud className="h-4 w-4" /> : null}
                    <span className="hidden sm:inline">
                      {isUploading ? "Uploading PDF..." : "Upload PDF"}
                    </span>
                    <span className="sm:hidden">
                      {isUploading ? "Uploading..." : "Upload"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {breadcrumbFolders.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-black/50 sm:gap-2 sm:text-sm">
                {breadcrumbFolders.map((folder, index) => (
                  <div key={folder.id} className="flex items-center gap-1.5 sm:gap-2">
                    {index > 0 ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-black/30" />
                    ) : null}
                    <button
                      className={cn(
                        "max-w-[140px] truncate transition hover:text-ink sm:max-w-none",
                        index === breadcrumbFolders.length - 1
                          ? "font-medium text-ink"
                          : "text-black/50",
                      )}
                      onClick={() => setSelectedFolderId(folder.id)}
                      type="button"
                    >
                      {folder.name}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <form
              className="grid grid-cols-1 gap-2 rounded-2xl border border-black/8 bg-[#f7f7f8] p-3 sm:rounded-[24px] md:grid-cols-2 xl:grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1fr)_auto]"
              onSubmit={handleCreateFolder}
            >
              <button
                className={cn(
                  "h-10 rounded-2xl border px-3 text-sm font-medium transition",
                  creationTarget === "root"
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-black/10 bg-white text-black/65",
                )}
                onClick={() => setCreationTarget("root")}
                type="button"
              >
                Root folder
              </button>
              <button
                className={cn(
                  "h-10 rounded-2xl border px-3 text-sm font-medium transition",
                  creationTarget === "current"
                    ? "border-[#171717] bg-[#171717] text-white"
                    : "border-black/10 bg-white text-black/65",
                )}
                disabled={!selectedFolderId}
                onClick={() => setCreationTarget("current")}
                type="button"
              >
                Inside current
              </button>
              <Input
                className="py-2.5 md:col-span-1 xl:col-span-1"
                placeholder={
                  creationTarget === "root"
                    ? "New root folder"
                    : "New nested folder"
                }
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
              />
              <Input
                className="py-2.5"
                placeholder="Optional description"
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
              />
              <Button
                className={cn(
                  "h-10 gap-2 rounded-2xl px-3 md:col-span-2 xl:col-span-1",
                  !draftName.trim() && "opacity-50",
                )}
                disabled={isCreatingFolder || !draftName.trim()}
                loading={isCreatingFolder}
                type="submit"
              >
                {!isCreatingFolder ? <FolderPlus className="h-4 w-4" /> : null}
                {isCreatingFolder ? "Creating..." : "Create"}
              </Button>
            </form>
          </div>
        </div>

        {foldersQuery.isLoading ? (
          <SectionLoader label="Loading folders..." />
        ) : !selectedFolderId ? (
          <div className="flex flex-1 items-center justify-center bg-[#f7f7f8] px-4 sm:px-6">
            <div className="max-w-lg text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#d8e4dc] text-[#173d31] sm:mb-5 sm:h-16 sm:w-16 sm:rounded-[24px]">
                <FolderOpen className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <h4 className="text-xl font-semibold text-ink sm:text-2xl">
                Select a folder to explore documents
              </h4>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8] px-3 py-3 sm:px-4 sm:py-4">
            {isUploading ? (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#d8e4dc] bg-white px-3 py-3 text-sm text-[#173d31] shadow-sm sm:rounded-3xl sm:px-4 sm:py-4">
                <Spinner size="sm" className="shrink-0 text-[#2f6d57]" />
                <span>
                  Upload in progress. We&apos;re processing the PDF and it will
                  appear here once indexing finishes.
                </span>
              </div>
            ) : null}

            <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {childFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="rounded-2xl border border-black/8 bg-white p-3 text-left transition hover:-translate-y-[1px] hover:border-black/12 hover:shadow-sm sm:rounded-[24px] sm:p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      className="rounded-2xl bg-[#d8e4dc] p-2.5 text-[#173d31]"
                      onClick={() => setSelectedFolderId(folder.id)}
                      type="button"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label={`Edit ${folder.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-black/75"
                        onClick={() => beginFolderEdit(folder)}
                        title="Edit folder"
                        type="button"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Delete ${folder.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-red-700"
                        onClick={() => handleDeleteFolder(folder)}
                        title="Delete folder"
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Open ${folder.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-black/35 transition hover:bg-black/5 hover:text-black/65"
                        onClick={() => setSelectedFolderId(folder.id)}
                        title="Open folder"
                        type="button"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    className="block max-w-full text-left"
                    onClick={() => setSelectedFolderId(folder.id)}
                    type="button"
                  >
                    <p className="truncate text-sm font-semibold text-ink">
                      {folder.name}
                    </p>
                  </button>
                  <p className="mt-1.5 text-xs text-black/55">
                    {folder.children.length} child folders and{" "}
                    {folder.total_document_count} PDFs
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop table header */}
            <div className="mb-3 hidden grid-cols-[minmax(0,2fr)_minmax(100px,140px)_80px_minmax(120px,150px)_70px] gap-3 rounded-3xl border border-black/8 bg-white px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-black/45 lg:grid">
              <span>Document</span>
              <span>Folder</span>
              <span>Pages</span>
              <span>Updated</span>
              <span>Actions</span>
            </div>

            <div className="space-y-2.5">
              {documentsQuery.isLoading ? <DocumentListSkeleton /> : null}

              {!documentsQuery.isLoading
                ? documents.map((document: DocumentItem) => (
                    <div
                      key={document.id}
                      className="rounded-2xl border border-black/8 bg-white p-3 transition hover:-translate-y-[1px] hover:border-black/12 hover:shadow-sm sm:rounded-3xl sm:p-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(100px,140px)_80px_minmax(120px,150px)_70px] lg:items-start lg:gap-3 lg:p-0 lg:px-4 lg:py-3"
                    >
                      <Link
                        href={`/documents/${document.id}`}
                        className="flex min-w-0 items-start gap-3"
                      >
                        <div className="rounded-2xl bg-[#d8e4dc] p-2 text-[#173d31]">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {document.original_filename}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-black/55 lg:truncate lg:line-clamp-none">
                            {document.summary ??
                              "Indexed PDF ready for retrieval"}
                          </p>
                          <p className="mt-1.5 text-xs uppercase tracking-[0.18em] text-black/40">
                            {formatBytes(document.file_size)} |{" "}
                            {document.status}
                          </p>
                        </div>
                      </Link>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/6 pt-3 lg:mt-0 lg:contents lg:border-0 lg:pt-0">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60 lg:contents">
                          <p className="lg:text-sm">
                            <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-black/40 lg:hidden">
                              Folder
                            </span>
                            {document.folder_name ?? "Folder"}
                          </p>
                          <p className="lg:text-sm">
                            <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-black/40 lg:hidden">
                              Pages
                            </span>
                            {document.page_count}
                          </p>
                          <p className="lg:text-sm">
                            <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-black/40 lg:hidden">
                              Updated
                            </span>
                            {formatDate(document.updated_at)}
                          </p>
                        </div>
                        <button
                          aria-label={`Delete ${document.original_filename}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-red-700"
                          disabled={deleteDocumentMutation.isPending}
                          onClick={() => handleDeleteDocument(document)}
                          title="Delete document"
                          type="button"
                        >
                          {deleteDocumentMutation.isPending &&
                          deleteConfirmation?.kind === "document" &&
                          deleteConfirmation.document.id === document.id ? (
                            <Spinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                : null}

              {!documentsQuery.isLoading && documents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-5 text-sm text-black/55 sm:rounded-3xl sm:px-5 sm:py-6">
                  No PDFs found in this folder tree yet.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {folderNavOpen ? (
        <button
          className="fixed inset-0 z-40 bg-black/35 xl:hidden"
          onClick={() => setFolderNavOpen(false)}
          type="button"
          aria-label="Close folder switcher"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[320px] flex-col border-l border-black/8 bg-[#f5f6f7] shadow-[-12px_0_40px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-out xl:static xl:z-auto xl:w-[320px] xl:max-w-none xl:shrink-0 xl:translate-x-0 xl:shadow-none",
          folderNavOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0",
        )}
      >
        <div className="border-b border-black/8 px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
                Folder Switcher
              </p>
              <h3 className="mt-2 flex items-center gap-2 text-base font-semibold text-ink">
                <Folders className="h-4 w-4 shrink-0 text-[#2f6d57]" />
                {flatFolders.length} folders
              </h3>
            </div>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/5 hover:text-ink xl:hidden"
              onClick={() => setFolderNavOpen(false)}
              type="button"
              aria-label="Close folder switcher"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button
              variant="ghost"
              className="h-9 rounded-2xl px-2 text-xs sm:px-3"
              onClick={() =>
                selectedFolderId && setSelectedFolderId(selectedFolderId)
              }
              type="button"
            >
              Current
            </Button>
            <Button
              variant="ghost"
              className="h-9 rounded-2xl px-2 text-xs sm:px-3"
              onClick={() => setExpandedIds(new Set())}
              type="button"
            >
              Collapse all
            </Button>
            <Button
              variant="ghost"
              className="col-span-2 h-9 rounded-2xl px-2 text-xs sm:col-span-1 sm:px-3"
              onClick={() => setExpandedIds(new Set(expandableIds))}
              type="button"
            >
              Expand all
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1.5">
            {foldersQuery.isLoading ? <FolderTreeSkeleton /> : null}
            {!foldersQuery.isLoading
              ? folders.map((folder) => (
                  <FolderNavNode
                    key={folder.id}
                    node={folder}
                    depth={0}
                    selectedFolderId={selectedFolderId}
                    onSelect={(folderId) => {
                      setSelectedFolderId(folderId);
                      setFolderNavOpen(false);
                    }}
                    expandedIds={expandedIds}
                    onToggle={toggleExpanded}
                    onBeginEdit={(folderNode) => {
                      beginFolderEdit(folderNode);
                      setFolderNavOpen(false);
                    }}
                    onDelete={handleDeleteFolder}
                  />
                ))
              : null}
            {!foldersQuery.isLoading && folders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-5 text-sm text-black/55">
                No folders yet. Create a root folder to start.
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </section>
  );
}

