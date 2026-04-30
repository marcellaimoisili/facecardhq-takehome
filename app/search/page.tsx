import Link from "next/link";
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
    <main className="relative min-h-screen">
      <header className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </header>
      <div className="mx-auto max-w-[860px] px-6 pb-16 pt-12">
        <SearchResults query={q} />
      </div>
    </main>
  );
}
