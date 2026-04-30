export type HistoryItem = {
  /** The actual query to run when clicked. */
  query: string;
  /** Optional user-renamed display label. Falls back to `query`. */
  label?: string;
  /** Unix ms; doubles as the unique id. */
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
    return parsed.filter(
      (h): h is HistoryItem =>
        typeof h?.query === "string" && typeof h?.ts === "number",
    );
  } catch {
    return [];
  }
}

export function appendHistory(query: string) {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = readHistory();
  const found = existing.find((h) => h.query === trimmed);
  const others = existing.filter((h) => h.query !== trimmed);
  const next = [
    { query: trimmed, ts: Date.now(), label: found?.label },
    ...others,
  ].slice(0, MAX);
  write(next);
}

export function renameHistory(ts: number, label: string) {
  if (typeof window === "undefined") return;
  const trimmed = label.trim();
  const next = readHistory().map((h) =>
    h.ts === ts ? { ...h, label: trimmed || undefined } : h,
  );
  write(next);
}

export function deleteHistory(ts: number) {
  if (typeof window === "undefined") return;
  const next = readHistory().filter((h) => h.ts !== ts);
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
