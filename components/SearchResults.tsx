"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { findById } from "@/lib/history";
import { readCachedAnswer, writeCachedAnswer } from "@/lib/answerCache";
import { Answer } from "./Answer";
import { AnswerActions } from "./AnswerActions";
import { SourceCard } from "./SourceCard";

type Props = { id: string };

export function SearchResults({ id }: Props) {
  // The URL gives us a UUID; the actual query lives in localStorage keyed by id.
  // We resolve the query on the client (localStorage is browser-only) before
  // running the tRPC query.
  const [query, setQuery] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const item = findById(id);
    setQuery(item?.query ?? null);
    setResolved(true);
  }, [id]);

  // Seed React Query with any cached answer from localStorage. On a fresh page
  // load (or returning to the tab tomorrow), if the cache is still valid we
  // skip the API call entirely and render instantly. Expired entries return
  // null so useQuery refetches.
  const cached = useMemo(
    () => (query ? readCachedAnswer(query) : null),
    [query],
  );

  const result = trpc.search.run.useQuery(
    { query: query ?? "" },
    {
      enabled: !!query,
      initialData: cached?.data,
      initialDataUpdatedAt: cached?.ts,
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60, // 1 hour — matches the localStorage TTL
    },
  );

  // Persist successful results so the cache survives a reload.
  useEffect(() => {
    if (result.data && query && !result.isFetching) {
      writeCachedAnswer(query, result.data);
    }
  }, [result.data, result.isFetching, query]);

  function handleCitationClick(n: number) {
    const el = document.getElementById(`source-${n}`);
    if (el)
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }

  // Search id resolved but no matching entry in localStorage (e.g. user shared
  // a link with someone else, or cleared their history).
  if (resolved && !query) {
    return (
      <div className="space-y-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">
          Search not found
        </h1>
        <p className="text-[14px] text-ink-muted">
          This search isn&apos;t in your history. It may have been deleted or saved on another
          device.
        </p>
        <Link href="/" className="inline-block text-[14px] text-accent underline">
          Back to search
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="max-w-answer text-[22px] font-semibold leading-snug tracking-tight text-ink">
          {query ?? <span className="text-ink-muted">Loading...</span>}
        </h1>
      </section>

      <section aria-labelledby="sources-heading">
        <SectionHeading id="sources-heading">Sources</SectionHeading>
        {result.error ? (
          <p className="text-[14px] text-error">{result.error.message}</p>
        ) : result.data ? (
          result.data.sources.length > 0 ? (
            <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]">
              {result.data.sources.map((s, i) => (
                <SourceCard key={s.id} source={s} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-ink-muted">No sources found.</p>
          )
        ) : (
          <SourcesSkeleton />
        )}
      </section>

      <section aria-labelledby="answer-heading">
        <SectionHeading id="answer-heading">Answer</SectionHeading>
        {result.error ? (
          <p className="text-[14px] text-error">{result.error.message}</p>
        ) : result.data ? (
          <>
            <Answer
              text={result.data.answer}
              sources={result.data.sources}
              onCitationClick={handleCitationClick}
            />
            <AnswerActions
              answer={result.data.answer}
              sources={result.data.sources}
              query={query ?? ""}
              onSourcesClick={() => {
                const el = document.getElementById("sources-heading");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          </>
        ) : (
          <AnswerSkeleton />
        )}
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
