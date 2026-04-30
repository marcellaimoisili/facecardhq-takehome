export type HistoryItem = {
  /** Unique id (UUID) for this history entry. Used in URLs: /search/{id}. */
  id: string;
  /** The actual query to run when clicked. */
  query: string;
  /** Optional user-renamed display label. Falls back to `query`. */
  label?: string;
  /** Unix ms; used for sorting. */
  ts: number;
};

const KEY = "search-history";
const MAX = 50;
const EVENT = "history-updated";

function write(items: HistoryItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate old entries that didn't have an id.
    return parsed
      .filter(
        (h) =>
          h && typeof h === "object" && typeof h.query === "string" && typeof h.ts === "number",
      )
      .map((h) => ({
        id: typeof h.id === "string" ? h.id : safeUUID(),
        query: h.query as string,
        label: typeof h.label === "string" ? h.label : undefined,
        ts: h.ts as number,
      }));
  } catch {
    return [];
  }
}

/**
 * Append (or move-to-top) a query in history. Returns the id of the entry,
 * which the caller uses to navigate to /search/{id}.
 */
export function appendHistory(query: string): string {
  if (typeof window === "undefined") return "";
  const trimmed = query.trim();
  if (!trimmed) return "";
  const existing = readHistory();
  const found = existing.find((h) => h.query === trimmed);
  if (found) {
    // Already in history — move to top, refresh ts, keep id and label.
    const others = existing.filter((h) => h.id !== found.id);
    const next = [{ ...found, ts: Date.now() }, ...others].slice(0, MAX);
    write(next);
    return found.id;
  }
  // New entry.
  const id = safeUUID();
  const next = [{ id, query: trimmed, ts: Date.now() }, ...existing].slice(0, MAX);
  write(next);
  return id;
}

export function findById(id: string): HistoryItem | undefined {
  return readHistory().find((h) => h.id === id);
}

export function renameHistory(id: string, label: string) {
  if (typeof window === "undefined") return;
  const trimmed = label.trim();
  const next = readHistory().map((h) =>
    h.id === id ? { ...h, label: trimmed || undefined } : h,
  );
  write(next);
}

export function deleteHistory(id: string) {
  if (typeof window === "undefined") return;
  const next = readHistory().filter((h) => h.id !== id);
  write(next);
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function subscribeToHistory(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older browsers — random-enough for our purposes (history ids).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
