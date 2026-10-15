import type { SavedCollege } from "@/lib/auth/api";

/**
 * A signed-out user who clicks "Save" is sent to login. We remember which
 * college they wanted (and the page to return to) so it is saved automatically
 * once they come back authenticated. Mirrors `FIT_LOGIN_INTENT_KEY`.
 */
export const SAVE_LOGIN_INTENT_KEY = "save_college_login_intent";

export interface SaveLoginIntent {
  url: string;
  unitid: string;
  record?: SavedCollege;
}

export function writeSaveLoginIntent(intent: SaveLoginIntent) {
  try {
    localStorage.setItem(SAVE_LOGIN_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // localStorage unavailable — proceed to login without the return hint.
  }
}

export function readSaveLoginIntent(): SaveLoginIntent | null {
  try {
    const raw = localStorage.getItem(SAVE_LOGIN_INTENT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.unitid ? (parsed as SaveLoginIntent) : null;
  } catch {
    return null;
  }
}

export function clearSaveLoginIntent() {
  try {
    localStorage.removeItem(SAVE_LOGIN_INTENT_KEY);
  } catch {
    // ignore
  }
}
