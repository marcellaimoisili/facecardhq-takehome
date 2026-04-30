"use client";

import { useState } from "react";
import type { Source } from "@/server/search/types";

type Props = {
  answer: string;
  sources: Source[];
  query: string;
  onSourcesClick?: () => void;
};

export function AnswerActions({ answer, sources, query, onSourcesClick }: Props) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  async function handleCopy() {
    try {
      // Copy the answer plus a numbered sources list so citations like [1]
      // in the text remain meaningful when pasted into Notes, email, etc.
      const sourcesBlock =
        sources.length > 0
          ? "\n\nSources:\n" +
            sources
              .map((s) => `[${s.id}] ${s.title} — ${s.domain}\n${s.url}`)
              .join("\n\n")
          : "";
      await navigator.clipboard.writeText(answer + sourcesBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: query, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {}
  }

  return (
    <div className="mt-6 flex items-center gap-2">
      {sources.length > 0 ? (
        <button
          type="button"
          onClick={onSourcesClick}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-bg px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:border-border-hover hover:text-ink"
        >
          <span className="flex -space-x-1.5">
            {sources.slice(0, 3).map((s) => (
              <span
                key={s.id}
                className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-bg bg-surface"
              >
                {s.favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.favicon} alt="" className="h-full w-full" />
                ) : null}
              </span>
            ))}
          </span>
          <span className="font-medium">
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </span>
        </button>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        <ActionButton aria-label={copied ? "Copied" : "Copy answer"} onClick={handleCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </ActionButton>
        <ActionButton aria-label={shared ? "Link copied" : "Share"} onClick={handleShare}>
          {shared ? <CheckIcon /> : <ShareIcon />}
        </ActionButton>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      {...rest}
    >
      {children}
    </button>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <rect
        x="8"
        y="8"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M12 4v12M7 9l5-5 5 5M5 21h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M5 13l4 4 10-10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
