"use client";

import type { Source } from "@/server/search/types";

type Props = {
  source: Source;
  onClick?: () => void;
};

export function CitationChip({ source, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={source.title}
      className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-border px-1.5 py-[1px] align-baseline font-mono text-[10px] leading-snug text-ink-muted transition-colors hover:bg-border-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      aria-label={`Source: ${source.domain}`}
    >
      {source.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source.favicon} alt="" className="h-3 w-3 rounded-sm" />
      ) : null}
      <span className="truncate">{source.domain}</span>
    </button>
  );
}
