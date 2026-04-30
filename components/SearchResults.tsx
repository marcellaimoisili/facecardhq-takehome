"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { appendHistory } from "@/lib/history";
import { Answer } from "./Answer";
import { SourceCard } from "./SourceCard";

type Props = { query: string };

export function SearchResults({ query }: Props) {
  const lastQueryRef = useRef<string | null>(null);
  const mutation = trpc.search.run.useMutation();

  useEffect(() => {
    if (!query || lastQueryRef.current === query) return;
    lastQueryRef.current = query;
    appendHistory(query);
    mutation.mutate({ query });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const data = mutation.data;
  const isPending = mutation.isPending || (!data && !mutation.error);

  function handleCitationClick(n: number) {
    const el = document.getElementById(`source-${n}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="max-w-answer text-[22px] font-semibold leading-snug tracking-tight text-ink">
          {query}
        </h1>
      </section>

      <section aria-labelledby="sources-heading">
        <SectionHeading id="sources-heading">Sources</SectionHeading>
        {isPending && !data ? (
          <SourcesSkeleton />
        ) : data && data.sources.length > 0 ? (
          <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]">
            {data.sources.map((s, i) => (
              <SourceCard key={s.id} source={s} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-ink-muted">No sources found.</p>
        )}
      </section>

      <section aria-labelledby="answer-heading">
        <SectionHeading id="answer-heading">Answer</SectionHeading>
        {mutation.error ? (
          <p className="text-[14px] text-error">{mutation.error.message}</p>
        ) : isPending ? (
          <AnswerSkeleton />
        ) : data ? (
          <Answer text={data.answer} onCitationClick={handleCitationClick} />
        ) : null}
      </section>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted"
    >
      {children}
    </h2>
  );
}

function SourcesSkeleton() {
  return (
    <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[88px] min-w-[240px] max-w-[280px] flex-1 animate-pulse rounded-xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}

function AnswerSkeleton() {
  return (
    <div className="max-w-answer space-y-3">
      <div className="h-3 w-[90%] animate-pulse rounded bg-border" />
      <div className="h-3 w-[78%] animate-pulse rounded bg-border" />
      <div className="h-3 w-[85%] animate-pulse rounded bg-border" />
      <div className="h-3 w-[60%] animate-pulse rounded bg-border" />
    </div>
  );
}
