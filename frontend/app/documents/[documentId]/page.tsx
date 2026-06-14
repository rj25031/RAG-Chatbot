"use client";

import { useParams } from "next/navigation";

import { useAuthedUser } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { DocumentDetailView } from "@/components/document-detail-view";

export default function DocumentDetailPage() {
  const { user, ready } = useAuthedUser();
  const params = useParams<{ documentId: string }>();

  if (!ready || !user) {
    return null;
  }

  return (
    <AppShell
      title="Document Detail"
      subtitle="Metadata, folder lineage, and source citation snippets for a single indexed PDF."
    >
      <DocumentDetailView documentId={Number(params.documentId)} />
    </AppShell>
  );
}
