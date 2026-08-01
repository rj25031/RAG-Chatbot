"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, FolderTree, Quote } from "lucide-react";

import { fetchDocumentDetail } from "@/lib/api";
import { DocumentDetailSkeleton } from "@/components/ui/loader";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function DocumentDetailView({ documentId }: { documentId: number }) {
  const documentQuery = useQuery({
    queryKey: ["document-detail", documentId],
    queryFn: () => fetchDocumentDetail(documentId),
  });

  const document = documentQuery.data;

  if (documentQuery.isLoading) {
    return <DocumentDetailSkeleton />;
  }

  if (documentQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-[#b42318]">
        {documentQuery.error.message || "Failed to load document."}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-black/55 sm:p-6">
        Document not found.
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#f7f7f8]">
      <div className="border-b border-black/8 bg-white px-3 py-4 sm:px-5 sm:py-5">
        <Link
          href="/documents"
          className="mb-3 inline-flex items-center gap-2 text-sm text-black/55 transition hover:text-ink sm:mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to documents
        </Link>
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
              Document Detail
            </p>
            <h3 className="mt-2 break-words text-xl font-semibold text-ink sm:text-2xl">
              {document.original_filename}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-black/55 sm:gap-3 sm:text-sm">
              <span className="rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1">
                {document.status}
              </span>
              <span>{document.page_count} pages</span>
              <span>{formatBytes(document.file_size)}</span>
              <span className="break-all">{document.mime_type}</span>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-black/8 bg-[#f7f7f8] px-3 py-3 text-sm text-black/60 sm:rounded-3xl sm:px-4 sm:py-4">
            Updated {formatDate(document.updated_at)}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="overflow-y-auto rounded-2xl border border-black/8 bg-white p-4 sm:rounded-[28px] sm:p-5 lg:min-h-0">
          <div className="mb-4 sm:mb-6">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
              Metadata
            </p>
            <div className="mt-3 space-y-3 text-sm text-black/65 sm:mt-4 sm:space-y-4">
              <div className="rounded-2xl bg-[#f7f7f8] p-3 sm:rounded-3xl sm:p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  Folder
                </p>
                <p className="font-medium text-ink">
                  {document.folder_name ?? "Unassigned"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f7f8] p-3 sm:rounded-3xl sm:p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <FolderTree className="h-4 w-4 shrink-0" />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Folder path
                  </span>
                </div>
                <p className="break-words leading-6 text-ink sm:leading-7">
                  {document.folder_path.length > 0
                    ? document.folder_path.join(" / ")
                    : "No folder path"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f7f8] p-3 sm:rounded-3xl sm:p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  Summary
                </p>
                <p className="leading-6 text-ink sm:leading-7">
                  {document.summary ??
                    "No summary was generated for this document."}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f7f8] p-3 sm:rounded-3xl sm:p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  Document id
                </p>
                <p className="font-medium text-ink">{document.id}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto rounded-2xl border border-black/8 bg-white p-4 sm:rounded-[28px] sm:p-5">
          <div className="mb-4 flex items-start gap-3 sm:mb-5 sm:items-center">
            <div className="shrink-0 rounded-2xl bg-[#d8e4dc] p-2.5 text-[#173d31] sm:p-3">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-black/45 sm:text-xs">
                Source Citations
              </p>
              <h4 className="text-base font-semibold text-ink sm:text-lg">
                Page references, indexed snippets, and retrieval-ready content
              </h4>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {document.citations.map((citation) => (
              <article
                key={citation.id}
                className="rounded-2xl border border-black/8 bg-[#f7f7f8] p-3 sm:rounded-[28px] sm:p-5"
              >
                <div className="mb-3 flex items-center gap-2 text-[#2f6d57]">
                  <Quote className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">
                    {citation.citation_label}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-black/40 sm:text-xs">
                  <span>Page {citation.page_number}</span>
                  <span>Chunk {citation.chunk_index + 1}</span>
                  <span>{citation.token_count} tokens</span>
                  <span>{citation.character_count} chars</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink sm:leading-7">
                  {citation.content}
                </p>
              </article>
            ))}

            {document.citations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-sm text-black/55 sm:rounded-3xl sm:px-5 sm:py-6">
                No indexed snippets are available for this document yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
