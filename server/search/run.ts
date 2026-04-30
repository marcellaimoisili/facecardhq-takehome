import type { SearchResult, Source } from "./types";
import { fetchSources } from "./serp";
import { generateAnswer } from "./llm";

// Thrown when SerpAPI doesn't return anything useful. The router catches this
// and maps it to a NOT_FOUND tRPC code so the client can show a specific UI.
export class NoSourcesError extends Error {
  constructor(query: string) {
    super(`No sources found for "${query}". Try rephrasing or being more specific.`);
    this.name = "NoSourcesError";
  }
}

export async function runSearch(query: string): Promise<SearchResult> {
  const sources = await fetchSources(query);
  if (sources.length === 0) {
    throw new NoSourcesError(query);
  }

  const { answer, ratings } = await generateAnswer(query, sources);

  // Merge per-source ratings (from the LLM) onto the source list. If the LLM
  // didn't rate a source, tier stays undefined and the UI shows no badge.
  const ratedSources = sources.map((s) => ({
    ...s,
    tier: ratings.get(s.id),
  }));

  return { query, sources: ratedSources, answer };
}

export type { SearchResult, Source };
