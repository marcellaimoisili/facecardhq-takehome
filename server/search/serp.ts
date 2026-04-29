import { getJson } from "serpapi";
import type { Source } from "./types";

const MAX_SOURCES = 6;

export async function fetchSources(query: string): Promise<Source[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not set");
  }

  const response = await getJson({
    engine: "google",
    q: query,
    api_key: apiKey,
    num: MAX_SOURCES,
  });

  const organic = (response.organic_results ?? []) as Array<{
    title?: string;
    link?: string;
    snippet?: string;
    source?: string;
  }>;

  return organic
    .filter((r) => r.link && r.title)
    .slice(0, MAX_SOURCES)
    .map((r, i) => {
      const url = r.link as string;
      const domain = safeDomain(url);
      return {
        id: i + 1,
        title: r.title as string,
        url,
        domain,
        snippet: r.snippet ?? "",
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      };
    });
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
