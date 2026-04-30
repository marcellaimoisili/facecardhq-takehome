import { SearchInput } from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <header className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </header>

      <div className="mx-auto flex min-h-screen max-w-[640px] flex-col items-stretch justify-center px-6 pb-24">
        <div className="mb-10">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">
            Ask anything.
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Get an answer with sources you can verify.
          </p>
        </div>

        <SearchInput size="lg" autoFocus />
      </div>
    </main>
  );
}
