"use client";

import { useAuthedUser } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentsWorkspace } from "@/components/features/documents-workspace";
import { PageLoader } from "@/components/ui/loader";

export default function HomePage() {
  const { user, ready } = useAuthedUser();

  if (!ready || !user) {
    return <PageLoader label="Loading documents..." />;
  }

  return (
    <AppShell
      title="Documents"
      subtitle="Manage folder structures, review indexed PDFs, and open detailed citation-backed document views."
    >
      <DocumentsWorkspace user={user} />
    </AppShell>
  );
}
