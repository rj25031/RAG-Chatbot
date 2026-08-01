"use client";

import { ChevronDown, ChevronRight, FolderPlus, FolderTree as FolderTreeIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { createFolder, fetchFolders } from "@/lib/api";
import type { User } from "@/types";
import type { FolderNode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderTreeSkeleton } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

function TreeNode({
  node,
  depth,
  selectedFolderId,
  onSelect,
  expandedIds,
  onToggle,
}: {
  node: FolderNode;
  depth: number;
  selectedFolderId: number | null;
  onSelect: (id: number) => void;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
}) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border px-3 py-2 transition",
          selectedFolderId === node.id
            ? "border-[#171717] bg-[#171717] text-white"
            : "border-black/6 bg-white/72 text-ink hover:border-black/10 hover:bg-white",
        )}
        style={{ marginLeft: `${depth * 14}px` }}
      >
        <button
          className="rounded-full p-1 text-black/45 transition hover:bg-black/5 hover:text-black disabled:opacity-30"
          disabled={!hasChildren}
          onClick={() => hasChildren && onToggle(node.id)}
          type="button"
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4 opacity-0" />
          )}
        </button>
        <button className="min-w-0 flex-1 text-left text-sm" onClick={() => onSelect(node.id)} type="button">
          <p className="truncate font-medium">{node.name}</p>
          {node.description ? <p className="truncate text-xs opacity-65">{node.description}</p> : null}
        </button>
      </div>
      {isExpanded
        ? node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))
        : null}
    </div>
  );
}

export function FolderTree({
  selectedFolderId,
  onSelect,
  user,
}: {
  selectedFolderId: number | null;
  onSelect: (id: number) => void;
  user: User;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();
  const foldersQuery = useQuery({
    queryKey: ["folders"],
    queryFn: fetchFolders,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createFolder({
        name: name.trim(),
        description: description.trim() || null,
        parent_folder_id: selectedFolderId,
      }),
    onSuccess: async (folder) => {
      setName("");
      setDescription("");
      toast.success(`Folder "${folder.name}" created.`);
      if (folder.parent_folder_id) {
        setExpandedIds((current) => new Set(current).add(folder.parent_folder_id as number));
      }
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      onSelect(folder.id);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const hasFolders = (foldersQuery.data?.length ?? 0) > 0;
  const totalFolders = useMemo(() => {
    const countNodes = (nodes: FolderNode[]): number =>
      nodes.reduce((total, item) => total + 1 + countNodes(item.children), 0);

    return countNodes(foldersQuery.data ?? []);
  }, [foldersQuery.data]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
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
    <aside className="flex h-full min-h-0 flex-col border-r border-black/8 bg-[#f5f6f7]">
      <div className="border-b border-black/8 px-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-black/45">Knowledge Structure</p>
          <h2 className="mt-2 flex items-center gap-2 text-lg font-semibold text-ink">
            <FolderTreeIcon className="h-5 w-5 text-[#2f6d57]" />
            Folders
          </h2>
          <p className="mt-2 text-sm text-black/55">
            {totalFolders} folders available. Select one to scope chat and documents.
          </p>
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <Input
            placeholder={selectedFolderId ? "New child folder" : "Create root folder"}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder="Optional description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Button
            className="w-full gap-2 rounded-2xl"
            type="submit"
            loading={createMutation.isPending}
          >
            {!createMutation.isPending ? <FolderPlus className="h-4 w-4" /> : null}
            {createMutation.isPending
              ? "Creating folder..."
              : selectedFolderId
                ? "Add Nested Folder"
                : "Add Root Folder"}
          </Button>
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {foldersQuery.isLoading ? <FolderTreeSkeleton /> : null}
        {!foldersQuery.isLoading && !hasFolders && (
          <p className="rounded-2xl border border-dashed border-black/10 p-4 text-sm text-black/60">
            Create a root folder to begin organizing documents.
          </p>
        )}
        <div className="space-y-2">
          {!foldersQuery.isLoading
            ? foldersQuery.data?.map((folder) => (
                <TreeNode
                  key={folder.id}
                  node={folder}
                  depth={0}
                  selectedFolderId={selectedFolderId}
                  onSelect={onSelect}
                  expandedIds={expandedIds}
                  onToggle={toggleExpanded}
                />
              ))
            : null}
        </div>
      </div>
    </aside>
  );
}
