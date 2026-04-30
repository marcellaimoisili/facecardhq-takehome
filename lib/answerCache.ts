/**
 * Persistent answer cache, keyed by query content.
 *
 * Why a separate cache from React Query:
 *   - React Query's cache is in-memory only — wiped on page reload.
 *   - This stores full results in localStorage so a reload doesn't cost an
 *     API call, and the same question across sessions returns instantly.
 *
 * Entries have a TTL (default 1 hour) because some questions go stale fast
 * ("what stocks are up today" should not return yesterday's answer). On read,
 * expired entries are returned as null so React Query refetches.
 */

import type { SearchResult } from "@/server/search/types";

type CacheEntry = {
  query: string; // normalized (trimmed, lowercased) query
  data: SearchResult;
  ts: number; // unix ms — when cached
};

const KEY = "answer-cache";
const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX = 50;

function normalize(query: string): string {
  return query.trim().toLowerCase();
}

function read(): CacheEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: CacheEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {}
}

/**
 * Look up a cached answer by query content. Returns null if not cached or expired.
 */
export function readCachedAnswer(
  query: string,
): { data: SearchResult; ts: number } | null {
  if (typeof window === "undefined") return null;
  const key = normalize(query);
  const entry = read().find((e) => e.query === key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return { data: entry.data, ts: entry.ts };
}

/**
 * Save an answer to the cache. Overwrites any existing entry for the same query.
 * Caps at MAX entries (oldest evicted).
 */
export function writeCachedAnswer(query: string, data: SearchResult) {
  if (typeof window === "undefined") return;
  const key = normalize(query);
  const existing = read().filter((e) => e.query !== key);
  const next: CacheEntry[] = [{ query: key, data, ts: Date.now() }, ...existing].slice(
    0,
    MAX,
  );
  write(next);
}

export function clearAnswerCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
