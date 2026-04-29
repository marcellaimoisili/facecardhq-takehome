import type { SearchResult, Source } from "./types";
import { fetchSources } from "./serp";
import { generateAnswer } from "./llm";

export async function runSearch(query: string): Promise<SearchResult> {
  const sources = await fetchSources(query);
  if (sources.length === 0) {
    return {
      query,
      sources: [],
      answer:
        "No relevant sources were found for that query. Try rephrasing or asking something more specific.",
    };
  }

  const answer = await generateAnswer(query, sources);
  return { query, sources, answer };
}

export type { SearchResult, Source };
