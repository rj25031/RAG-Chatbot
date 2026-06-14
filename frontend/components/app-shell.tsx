"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LogIn,
  Menu,
  MessageSquareText,
  Settings,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import {
  clearCurrentUser,
  clearSelectedModel,
  getCurrentUser,
  getUserSessionEventName,
} from "@/lib/session";
import type { User } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageSquareText },
  { href: "/settings", label: "Settings", icon: Settings },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: typeof LogIn }>;

function initialsForUser(user: User | null) {
  if (!user) return "KB";
  return user.full_name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({
  children,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    syncUser();
    window.addEventListener(getUserSessionEventName(), syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener(getUserSessionEventName(), syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("kb-sidebar-collapsed");
    setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kb-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const handleLogout = () => {
    clearCurrentUser();
    clearSelectedModel();
    setUser(null);
    router.push("/login");
  };

  return (
    <main className="flex h-screen bg-[radial-gradient(circle_at_top_left,_rgba(118,153,136,0.24),_transparent_28%),linear-gradient(180deg,_#f6f7f8_0%,_#eceff1_100%)] text-ink">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-black/8 bg-[#171717] text-white transition-all duration-300 lg:static",
          collapsed ? "w-[88px]" : "w-[292px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <h1 className="mt-2 truncate text-lg font-semibold">RAG Chatbot</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-5">
          {links.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-2xl px-3 py-3 text-sm transition",
                  collapsed ? "justify-center" : "gap-3",
                  active
                    ? "bg-white text-[#171717] shadow-[0_12px_24px_rgba(255,255,255,0.12)]"
                    : "text-white/72 hover:bg-white/10 hover:text-white",
                )}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? link.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{link.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
         
          <div
            className={cn(
              "rounded-3xl border border-white/10 bg-white/5 p-3",
              collapsed ? "flex flex-col items-center gap-3" : "space-y-3",
            )}
          >
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                {initialsForUser(user)}
              </div>
              {!collapsed && user ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
                  <p className="truncate text-xs text-white/55">{user.email}</p>
                </div>
              ) : null}
            </div>
            {!collapsed ? (
              <Button className="w-full justify-center bg-white text-[#171717] hover:bg-white/90" onClick={handleLogout} type="button">
                Logout
              </Button>
            ) : (
              <button
                className="rounded-2xl border border-white/10 p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
                onClick={handleLogout}
                type="button"
                title="Logout"
              >
                <LogIn className="h-4 w-4 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        <button
          className="absolute left-3 top-3 z-20 rounded-full border border-black/10 bg-white p-2 text-black/65 shadow-sm transition hover:bg-black hover:text-white lg:hidden"
          onClick={() => setMobileOpen(true)}
          type="button"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex h-full min-h-0 flex-col overflow-hidden">{children}</div>
      </div>

      {mobileOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}
    </main>
  );
}
