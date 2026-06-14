"use client";

import { useAuthedUser } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";
import { ChatPanel } from "@/components/chat-panel";

export default function ChatPage() {
  const { user, ready } = useAuthedUser();

  if (!ready || !user) {
    return null;
  }

  return (
    <AppShell
      title="Chat"
      subtitle="A full-screen conversation workspace with folder-scoped retrieval and a dedicated history rail."
    >
      <ChatPanel user={user} />
    </AppShell>
  );
}
