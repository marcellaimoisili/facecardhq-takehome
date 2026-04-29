export type Source = {
  /** 1-indexed citation number */
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  favicon?: string;
};

export type SearchResult = {
  query: string;
  sources: Source[];
  /** Raw answer text. Citations appear inline as [1], [2], etc. */
  answer: string;
};
