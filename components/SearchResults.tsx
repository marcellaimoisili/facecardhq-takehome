"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { findById } from "@/lib/history";
import { readCachedAnswer, writeCachedAnswer } from "@/lib/answerCache";
import type { Source } from "@/server/search/types";
import { Answer } from "./Answer";
import { AnswerActions } from "./AnswerActions";

type Props = { id: string };

type StreamState = {
  status: "idle" | "streaming" | "done" | "error";
  sources: Source[];
  // Raw text from the server, grows in bursts.
  bufferedAnswer: string;
  // What the user sees: catches up to bufferedAnswer at a smooth rate.
  displayedAnswer: string;
  error: string | null;
};

const INITIAL_STREAM: StreamState = {
  status: "idle",
  sources: [],
  bufferedAnswer: "",
  displayedAnswer: "",
  error: null,
};

export function SearchResults({ id }: Props) {
  // The URL gives us a UUID; the actual query lives in localStorage keyed by id.
  const [query, setQuery] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [stream, setStream] = useState<StreamState>(INITIAL_STREAM);

  useEffect(() => {
    const item = findById(id);
    setQuery(item?.query ?? null);
    setResolved(true);
    // Reset stream state when the id changes (sidebar navigation between chats).
    setStream(INITIAL_STREAM);
  }, [id]);

  // Cache hit short-circuits the subscription entirely. Set the stream state
  // to the cached value so the rest of the rendering logic can stay uniform.
  const cached = useMemo(
    () => (query ? readCachedAnswer(query) : null),
    [query],
  );

  useEffect(() => {
    if (cached) {
      setStream({
        status: "done",
        sources: cached.data.sources,
        bufferedAnswer: cached.data.answer,
        displayedAnswer: cached.data.answer,
        error: null,
      });
    }
  }, [cached]);

  // Smoothing tick: catches displayedAnswer up to bufferedAnswer over time.
  // Speed scales with backlog so big bursts (Groq dumps) drain quickly without
  // looking instant, while small drips look like real typing.
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (stream.status !== "streaming") {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    function tick() {
      setStream((s) => {
        const remaining = s.bufferedAnswer.length - s.displayedAnswer.length;
        if (remaining <= 0) return s;
        // ~3 chars per frame minimum (slow, "typing"), scale up if we're far
        // behind. Capped so we never feel choppy.
        const charsThisFrame = Math.min(40, Math.max(3, Math.ceil(remaining / 12)));
        return {
          ...s,
          displayedAnswer: s.bufferedAnswer.slice(
            0,
            s.displayedAnswer.length + charsThisFrame,
          ),
        };
      });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stream.status]);

  // Subscribe to the streaming procedure when we have a query and no cache.
  // tRPC handles SSE under the hood; we just react to events.
  trpc.search.stream.useSubscription(
    { query: query ?? "" },
    {
      enabled: !!query && !cached,
      onData: (event) => {
        switch (event.type) {
          case "sources":
            setStream((s) => ({
              ...s,
              status: "streaming",
              sources: event.sources,
              error: null,
            }));
            break;
          case "token":
            // Append to buffer; smoothing tick handles catch-up.
            setStream((s) => ({
              ...s,
              bufferedAnswer: s.bufferedAnswer + event.text,
            }));
            break;
          case "done":
            // Snap to final answer (no flash of ratings since server filtered
            // them out, but this also handles any tail the smoother hasn't
            // caught up to yet).
            setStream((s) => ({
              ...s,
              status: "done",
              sources: event.sources,
              bufferedAnswer: event.finalAnswer,
              displayedAnswer: event.finalAnswer,
            }));
            if (query) {
              writeCachedAnswer(query, {
                query,
                sources: event.sources,
                answer: event.finalAnswer,
              });
            }
            break;
        }
      },
      onError: (err) => {
        setStream((s) => ({ ...s, status: "error", error: err.message }));
      },
    },
  );

  // Citation chip click: expand sources panel and scroll to the matching one.
  function handleCitationClick(n: number) {
    setShowSources(true);
    requestAnimationFrame(() => {
      const el = document.getElementById(`source-${n}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

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

  const showAnswer = stream.displayedAnswer.length > 0;
  const showActions = stream.status === "done";
  const showSourcesPanel = showSources && stream.sources.length > 0;
  const isStreaming = stream.status === "streaming";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="max-w-answer text-[22px] font-semibold leading-snug tracking-tight text-ink">
          {query ?? <span className="text-ink-muted">Loading...</span>}
        </h1>
      </section>

      <section aria-labelledby="answer-heading">
        <StatusHeading stream={stream} />
        {stream.error ? (
          <p className="text-[14px] text-error">{stream.error}</p>
        ) : showAnswer ? (
          <>
            <Answer
              text={stream.displayedAnswer}
              sources={stream.sources}
              onCitationClick={handleCitationClick}
            />
            {isStreaming ? (
              <span className="ml-1 inline-block h-4 w-[2px] animate-caret-pulse bg-accent align-middle" />
            ) : null}
            {showActions ? (
              <AnswerActions
                answer={stream.displayedAnswer}
                sources={stream.sources}
                query={query ?? ""}
                expanded={showSources}
                onSourcesClick={() => setShowSources((s) => !s)}
              />
            ) : null}
            {showSourcesPanel ? <SourcesPanel sources={stream.sources} /> : null}
          </>
        ) : (
          <AnswerSkeleton />
        )}
      </section>
    </div>
  );
}

function SourcesPanel({ sources }: { sources: Source[] }) {
  return (
    <section aria-labelledby="sources-heading" className="mt-6">
      <SectionHeading id="sources-heading">Sources</SectionHeading>
      <ul className="space-y-2">
        {sources.map((s, i) => (
          <li key={s.id} id={`source-${s.id}`}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ animationDelay: `${i * 30}ms` }}
              className="flex gap-3 rounded-xl border border-border bg-surface p-4 opacity-0 animate-fade-rise transition-colors hover:border-border-hover"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {s.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.favicon} alt="" className="h-4 w-4 rounded-sm" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-[11px] tabular text-ink-muted">
                    {s.domain}
                  </span>
                  <TierBadge tier={s.tier} />
                  <span className="ml-auto font-mono text-[10px] tabular text-ink-muted">
                    [{s.id}]
                  </span>
                </div>
                <p className="mt-1 text-[14px] font-medium leading-snug text-ink">
                  {s.title}
                </p>
                {s.snippet ? (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-muted">
                    {s.snippet}
                  </p>
                ) : null}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TierBadge({ tier }: { tier?: "official" | "trusted" | "other" }) {
  if (tier === "official") {
    return (
      <span className="rounded-full bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent">
        Official
      </span>
    );
  }
  if (tier === "trusted") {
    return (
      <span className="rounded-full bg-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink-muted">
        Trusted
      </span>
    );
  }
  return null;
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

// Dynamic heading above the answer area. Shimmers through phases while the
// LLM works, settles to a plain "Answer" once tokens are flowing.
function StatusHeading({ stream }: { stream: StreamState }) {
  const status = stream.error
    ? null
    : stream.status === "idle" || (stream.status === "streaming" && stream.sources.length === 0)
      ? "Searching the web"
      : stream.status === "streaming" && stream.displayedAnswer.length === 0
        ? "Reading sources"
        : null;

  if (status) {
    return (
      <h2
        id="answer-heading"
        className="mb-3 text-[15px] font-medium tracking-tight shimmer-text"
      >
        {status}
        <span className="dots-loader" aria-hidden>
          <span className="dot">.</span>
          <span className="dot">.</span>
          <span className="dot">.</span>
        </span>
      </h2>
    );
  }
  return <SectionHeading id="answer-heading">Answer</SectionHeading>;
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
