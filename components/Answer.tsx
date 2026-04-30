"use client";

import { Fragment, useMemo } from "react";
import { CitationChip } from "./CitationChip";

type Props = {
  text: string;
  onCitationClick?: (n: number) => void;
};

const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

type Token =
  | { kind: "text"; value: string }
  | { kind: "citations"; nums: number[] };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(CITATION_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, start) });
    }
    const nums = match[1]
      .split(",")
      .map((n) => Number.parseInt(n.trim(), 10))
      .filter((n) => Number.isFinite(n));
    tokens.push({ kind: "citations", nums });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

export function Answer({ text, onCitationClick }: Props) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const paragraphs = useMemo(() => splitParagraphs(tokens), [tokens]);

  return (
    <div className="prose-answer max-w-answer space-y-4 text-[16px] leading-[1.65] text-ink">
      {paragraphs.map((para, pi) => (
        <p key={pi}>
          {para.map((tok, ti) => {
            if (tok.kind === "text") return <Fragment key={ti}>{tok.value}</Fragment>;
            return (
              <span key={ti} className="inline-flex items-center">
                {tok.nums.map((n, ni) => (
                  <CitationChip key={ni} n={n} onClick={onCitationClick} />
                ))}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

function splitParagraphs(tokens: Token[]): Token[][] {
  const paragraphs: Token[][] = [[]];
  for (const tok of tokens) {
    if (tok.kind === "text") {
      const parts = tok.value.split(/\n\s*\n/);
      parts.forEach((part, i) => {
        if (i > 0) paragraphs.push([]);
        if (part) paragraphs[paragraphs.length - 1].push({ kind: "text", value: part });
      });
    } else {
      paragraphs[paragraphs.length - 1].push(tok);
    }
  }
  return paragraphs.filter((p) => p.length > 0);
}
