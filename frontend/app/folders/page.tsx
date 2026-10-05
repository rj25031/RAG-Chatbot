"use client";

import { useAuthedUser } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { DocumentsWorkspace } from "@/components/features/documents-workspace";
import { PageLoader } from "@/components/ui/loader";

export default function FoldersPage() {
  const { user, ready } = useAuthedUser();

  if (!ready || !user) {
    return <PageLoader label="Loading folders..." />;
  }

  return (
    <AppShell
      title="Folders"
      subtitle="Organize your knowledge base into a nested folder structure."
    >
      <DocumentsWorkspace user={user} />
    </AppShell>
  );
}
