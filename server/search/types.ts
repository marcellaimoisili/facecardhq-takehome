export type Tier = "official" | "trusted" | "other";

export type Source = {
  /** 1-indexed citation number */
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon?: string;
  /**
   * Credibility tier assigned by the LLM at answer time, contextual to the
   * query. Optional because parsing can fail; the UI degrades gracefully.
   */
  tier?: Tier;
};

export type SearchResult = {
  query: string;
  sources: Source[];
  /** Answer text with inline [1], [2, 3] citations. */
  answer: string;
};
