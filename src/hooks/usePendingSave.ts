"use client";

import { useEffect, useRef } from "react";

import type { AuthUser } from "@/context/AuthContext";
import {
  ensureSavedLoaded,
  isSaved,
  toggleSaved,
} from "@/components/search/useSavedColleges";
import {
  clearSaveLoginIntent,
  readSaveLoginIntent,
} from "@/lib/saveLoginIntent";

/**
 * Completes a Save the user attempted while signed out. Once authenticated, the
 * card whose unitid matches the stored intent saves itself (the button flips to
 * "saved"). `onResult` lets the caller show its own success/error message.
 */
export function usePendingSave(
  user: AuthUser | null,
  unitid: string | null | undefined,
  onResult: (outcome: { saved: true } | { error: unknown }) => void,
) {
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!user || !unitid) return;
    const intent = readSaveLoginIntent();
    if (!intent || String(intent.unitid) !== String(unitid)) return;
    clearSaveLoginIntent(); // consume first so it can never fire twice

    void (async () => {
      try {
        await ensureSavedLoaded();
        // Already saved (e.g. from an earlier session) — nothing to toggle.
        if (isSaved(unitid)) return;
        await toggleSaved(unitid, intent.record);
        onResultRef.current({ saved: true });
      } catch (error) {
        onResultRef.current({ error });
      }
    })();
  }, [user, unitid]);
}
