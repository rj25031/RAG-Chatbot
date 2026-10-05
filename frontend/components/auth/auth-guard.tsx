"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchCurrentUser } from "@/lib/api";
import {
  clearCurrentUser,
  getAccessToken,
  getCurrentUser,
  getUserSessionEventName,
  saveCurrentUser,
} from "@/lib/session";
import type { User } from "@/types";

export function useAuthedUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncUser = () => {
      if (!getAccessToken()) {
        clearCurrentUser();
        router.replace("/login");
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        fetchCurrentUser()
          .then((user) => {
            saveCurrentUser(user);
            setUser(user);
            setReady(true);
          })
          .catch(() => {
            clearCurrentUser();
            router.replace("/login");
          });
        return;
      }

      setUser(currentUser);
      setReady(true);
    };

    syncUser();
    window.addEventListener(getUserSessionEventName(), syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener(getUserSessionEventName(), syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, [router]);

  return { user, ready };
}
