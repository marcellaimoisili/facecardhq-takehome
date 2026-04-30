"use client";

type Props = {
  n: number;
  onClick?: (n: number) => void;
};

export function CitationChip({ n, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(n)}
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 align-text-top font-mono text-[10px] font-medium leading-none text-accent-ink transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      aria-label={`Source ${n}`}
    >
      {n}
    </button>
  );
}
