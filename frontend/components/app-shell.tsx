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

function pageTitleForPath(pathname: string) {
  const match = links.find(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
  if (match) return match.label;
  if (pathname.startsWith("/documents/")) return "Document";
  return "Workspace";
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    clearCurrentUser();
    clearSelectedModel();
    setUser(null);
    router.push("/login");
  };

  const pageTitle = pageTitleForPath(pathname);

  return (
    <main className="flex h-[100dvh] bg-[radial-gradient(circle_at_top_left,_rgba(118,153,136,0.24),_transparent_28%),linear-gradient(180deg,_#f6f7f8_0%,_#eceff1_100%)] pt-[env(safe-area-inset-top,0px)] text-ink">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(292px,88vw)] shrink-0 flex-col border-r border-black/8 bg-[#171717] text-white transition-transform duration-300 ease-out lg:static lg:w-auto lg:transition-[width]",
          collapsed ? "lg:w-[88px]" : "lg:w-[292px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 sm:px-4 sm:py-4">
          <div className={cn("min-w-0", collapsed && "lg:hidden")}>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              RAG Chatbot
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="hidden rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:inline-flex"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
            <button
              className="rounded-full border border-white/10 p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setMobileOpen(false)}
              type="button"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-4 sm:space-y-2 sm:px-3 sm:py-5">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center rounded-2xl px-3 py-3 text-sm transition",
                  collapsed ? "lg:justify-center" : "gap-3",
                  active
                    ? "bg-white text-[#171717] shadow-[0_12px_24px_rgba(255,255,255,0.12)]"
                    : "text-white/72 hover:bg-white/10 hover:text-white",
                )}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? link.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-2.5 py-3 sm:px-3 sm:py-4">
          <div
            className={cn(
              "rounded-3xl border border-white/10 bg-white/5 p-3",
              collapsed ? "lg:flex lg:flex-col lg:items-center lg:gap-3" : "space-y-3",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                collapsed ? "lg:justify-center" : "gap-3",
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold sm:h-11 sm:w-11">
                {initialsForUser(user)}
              </div>
              {user ? (
                <div className={cn("min-w-0", collapsed && "lg:hidden")}>
                  <p className="truncate text-sm font-medium text-white">
                    {user.full_name}
                  </p>
                  <p className="truncate text-xs text-white/55">{user.email}</p>
                </div>
              ) : null}
            </div>
            <div className={cn(collapsed && "lg:hidden")}>
              <Button
                className="w-full justify-center bg-white text-[#171717] hover:bg-white/90"
                onClick={handleLogout}
                type="button"
              >
                Logout
              </Button>
            </div>
            {collapsed ? (
              <button
                className="hidden rounded-2xl border border-white/10 p-2 text-white/75 transition hover:bg-white/10 hover:text-white lg:inline-flex"
                onClick={handleLogout}
                type="button"
                title="Logout"
                aria-label="Logout"
              >
                <LogIn className="h-4 w-4 rotate-180" />
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-black/8 bg-white/90 px-3 py-2.5 backdrop-blur-sm lg:hidden">
          <button
            className="rounded-full border border-black/10 bg-white p-2 text-black/65 shadow-sm transition hover:bg-black hover:text-white"
            onClick={() => setMobileOpen(true)}
            type="button"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{pageTitle}</p>
            <p className="truncate text-[11px] text-black/45">RAG Chatbot</p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>

      {mobileOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
          type="button"
          aria-label="Close navigation overlay"
        />
      ) : null}
    </main>
  );
}
