"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import type { AuthUser } from "@/context/AuthContext";
import { readSaveLoginIntent } from "@/lib/saveLoginIntent";

// After a signed-out user was bounced to login from a Save button, send them
// back to the page they came from once authenticated. The matching card then
// completes the save (see `usePendingSave`).
export function useSaveLoginRedirect(user: AuthUser | null) {
  const router = useRouter();

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const intent = readSaveLoginIntent();
    if (intent?.url) {
      const here = window.location.pathname + window.location.search;
      if (here !== intent.url) router.push(intent.url);
    }
  }, [user, router]);
}
