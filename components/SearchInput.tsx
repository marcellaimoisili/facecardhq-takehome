"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  initialValue?: string;
  size?: "lg" | "sm";
  autoFocus?: boolean;
};

export function SearchInput({ initialValue = "", size = "lg", autoFocus = false }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const heightClass = size === "lg" ? "h-14" : "h-11";
  const padClass = size === "lg" ? "pl-6 pr-2 text-[16px]" : "pl-4 pr-2 text-[14px]";
  const buttonSize = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className={`relative flex w-full items-center rounded-full border border-border bg-surface ${heightClass} transition-colors focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/15`}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything"
          autoFocus={autoFocus}
          className={`flex-1 bg-transparent ${padClass} text-ink placeholder:text-ink-muted focus:outline-none`}
          aria-label="Search"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={`mr-1.5 inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-hover disabled:bg-border disabled:text-ink-muted ${buttonSize}`}
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" fill="none" className={iconSize} aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
