"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, FolderTree, Quote } from "lucide-react";

import { fetchDocumentDetail } from "@/lib/api";

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
    return (
      <div className="p-6 text-sm text-black/55">
        Loading document details...
      </div>
    );
  }

  if (!document) {
    return <div className="p-6 text-sm text-black/55">Document not found.</div>;
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#f7f7f8]">
      <div className="border-b border-black/8 bg-white px-5 py-5">
        <Link
          href="/documents"
          className="mb-4 inline-flex items-center gap-2 text-sm text-black/55 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to documents
        </Link>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-black/45">
              Document Detail
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">
              {document.original_filename}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-black/55">
              <span className="rounded-full border border-black/10 bg-[#f7f7f8] px-3 py-1">
                {document.status}
              </span>
              <span>{document.page_count} pages</span>
              <span>{formatBytes(document.file_size)}</span>
              <span>{document.mime_type}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-black/8 bg-[#f7f7f8] px-4 py-4 text-sm text-black/60">
            Updated {formatDate(document.updated_at)}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-y-auto rounded-[28px] border border-black/8 bg-white p-5">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.28em] text-black/45">
              Metadata
            </p>
            <div className="mt-4 space-y-4 text-sm text-black/65">
              <div className="rounded-3xl bg-[#f7f7f8] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  Folder
                </p>
                <p className="font-medium text-ink">
                  {document.folder_name ?? "Unassigned"}
                </p>
              </div>
              <div className="rounded-3xl bg-[#f7f7f8] p-4">
                <div className="mb-2 flex items-center gap-2 text-black/45">
                  <FolderTree className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-[0.18em]">
                    Folder path
                  </span>
                </div>
                <p className="leading-7 text-ink">
                  {document.folder_path.length > 0
                    ? document.folder_path.join(" / ")
                    : "No folder path"}
                </p>
              </div>
              <div className="rounded-3xl bg-[#f7f7f8] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  Summary
                </p>
                <p className="leading-7 text-ink">
                  {document.summary ??
                    "No summary was generated for this document."}
                </p>
              </div>
              <div className="rounded-3xl bg-[#f7f7f8] p-4">
                <p className="mb-1 text-xs uppercase tracking-[0.18em] text-black/40">
                  Document id
                </p>
                <p className="font-medium text-ink">{document.id}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto rounded-[28px] border border-black/8 bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-[#d8e4dc] p-3 text-[#173d31]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-black/45">
                Source Citations
              </p>
              <h4 className="text-lg font-semibold text-ink">
                Page references, indexed snippets, and retrieval-ready content
              </h4>
            </div>
          </div>

          <div className="space-y-4">
            {document.citations.map((citation) => (
              <article
                key={citation.id}
                className="rounded-[28px] border border-black/8 bg-[#f7f7f8] p-5"
              >
                <div className="mb-3 flex items-center gap-2 text-[#2f6d57]">
                  <Quote className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {citation.citation_label}
                  </span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-black/40">
                  <span>Page {citation.page_number}</span>
                  <span>Chunk {citation.chunk_index + 1}</span>
                  <span>{citation.token_count} tokens</span>
                  <span>{citation.character_count} chars</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-ink">
                  {citation.content}
                </p>
              </article>
            ))}

            {document.citations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 px-5 py-6 text-sm text-black/55">
                No indexed snippets are available for this document yet.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
