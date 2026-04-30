import Link from "next/link";
import { SearchInput } from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchResults } from "@/components/SearchResults";

type Props = {
  searchParams: Promise<{ q?: string }> | { q?: string };
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  if (!q) {
    return (
      <main className="mx-auto max-w-[640px] px-6 py-24">
        <p className="text-ink-muted">No query.</p>
        <Link href="/" className="mt-4 inline-block text-accent underline">
          Back to search
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] items-center gap-3 px-6 py-3">
          <Link
            href="/"
            className="font-mono text-[12px] tabular text-ink-muted hover:text-ink"
            aria-label="Home"
          >
            search
          </Link>
          <div className="flex-1">
            <SearchInput size="sm" initialValue={q} />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-[860px] px-6 py-8">
        <SearchResults query={q} />
      </div>
    </main>
  );
}
