import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchResults } from "@/components/SearchResults";

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function SearchPage({ params }: Props) {
  const p = await params;
  const id = (p.id ?? "").trim();

  if (!id) {
    return (
      <main className="mx-auto max-w-[640px] px-6 py-24">
        <p className="text-ink-muted">No search id.</p>
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
        <SearchResults id={id} />
      </div>
    </main>
  );
}
