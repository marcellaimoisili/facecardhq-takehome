"use client";

import type { Source } from "@/server/search/types";

type Props = {
  source: Source;
  index: number;
};

export function SourceCard({ source, index }: Props) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      id={`source-${source.id}`}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group flex h-full min-w-[240px] max-w-[280px] flex-col gap-2 rounded-xl border border-border bg-surface p-4 opacity-0 animate-fade-rise transition-colors hover:border-border-hover focus-visible:border-accent focus-visible:outline-none"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-bg">
          {source.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source.favicon} alt="" className="h-4 w-4 rounded-sm" />
          ) : null}
        </span>
        <span className="truncate font-mono text-[11px] tabular text-ink-muted">
          {source.domain}
        </span>
        <span className="ml-auto font-mono text-[10px] tabular text-ink-muted">
          {String(source.id).padStart(2, "0")}
        </span>
      </div>
      <p className="line-clamp-3 text-[13px] font-medium leading-snug text-ink">
        {source.title}
      </p>
    </a>
  );
}
