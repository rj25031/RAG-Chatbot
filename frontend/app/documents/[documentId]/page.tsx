"use client";

import { useParams } from "next/navigation";

import { useAuthedUser } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentDetailView } from "@/components/features/document-detail-view";
import { PageLoader } from "@/components/ui/loader";

export default function DocumentDetailPage() {
  const { user, ready } = useAuthedUser();
  const params = useParams<{ documentId: string }>();
  const documentId = Number(params.documentId);
  const isValidId = Number.isFinite(documentId) && documentId > 0;

  if (!ready || !user) {
    return <PageLoader label="Loading document..." />;
  }

  return (
    <AppShell
      title="Document Detail"
      subtitle="Metadata, folder lineage, and source citation snippets for a single indexed PDF."
    >
      {isValidId ? (
        <DocumentDetailView documentId={documentId} />
      ) : (
        <div className="p-6 text-sm text-black/55">Invalid document id.</div>
      )}
    </AppShell>
  );
}
