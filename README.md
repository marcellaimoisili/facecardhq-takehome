# Perplexity-style search — Face Card take-home

A simple Perplexity clone providing web sources from SerpAPI plus an LLM-written answer with inline citations. Built on Next.js App Router, tRPC v11, and Tailwind.

The interesting parts: streaming over SSE via tRPC v11 subscriptions, source credibility ratings classified contextually by the LLM and a persistent answer cache in localStorage for repeat questions.

## Setup

Prereqs:
- Node 18+
- A SerpAPI key — free at https://serpapi.com
- At least one LLM key:
  - Groq (recommended for local) — free at https://console.groq.com
  - Anthropic — works if your key has credit

```bash
npm install
cp .env.example .env.local
# fill in the keys
npm run dev
```

Open http://localhost:3000.

## Stack

- Next.js 14 (App Router)
- tRPC v11 with `@trpc/react-query`
- Tailwind CSS with CSS-variable design tokens (light + dark)
- Zod for input validation
- Anthropic SDK + Groq SDK (fallback chain)
- `serpapi` for web search

## File layout

```
app/
  layout.tsx                    Root: Geist fonts, theme bootstrap, sidebar shell
  page.tsx                      Landing — centered hero
  search/[id]/page.tsx          Results page — server component, passes UUID to client
  api/trpc/[trpc]/route.ts      tRPC HTTP + SSE handler (the bridge between browser and procedures)
  providers.tsx                 tRPC + React Query providers, splitLink routes subscriptions over SSE
  globals.css                   Tailwind base + theme CSS variables + shimmer/dots animations

server/
  trpc.ts                       initTRPC, router/procedure builders, superjson transformer
  context.ts                    Per-request context (empty stub — see below)
  routers/
    _app.ts                     Root router composer
    search.ts                   search.run (query) + search.stream (subscription)
  search/
    run.ts                      Pipeline orchestrator, NoSourcesError class
    serp.ts                     SerpAPI integration (top 6 organic results)
    llm.ts                      Anthropic + Groq, streaming and non-streaming
    types.ts                    Source / SearchResult / Tier types

components/
  SearchInput / SearchResults / Answer / CitationChip / AnswerActions
  HistorySidebar / ConfirmDialog / ThemeToggle

lib/
  trpc.ts                       Typed client instance
  history.ts                    LocalStorage history, UUID-keyed
  sidebar.ts                    LocalStorage sidebar collapsed state
  answerCache.ts                Persistent answer cache with TTL
```

## Data flow

1. User types a question → `SearchInput.onSubmit` generates a UUID, stores `{id, query}` in localStorage, navigates to `/search/{id}`.
2. `app/search/[id]/page.tsx` (server component) passes `id` to `<SearchResults>` (the only client subtree).
3. `<SearchResults>` resolves the query from localStorage by id.
4. **Cache hit?** Render the cached answer instantly. No network call.
5. **Cache miss?** Subscribe to `trpc.search.stream`. The server:
   - Fetches sources from SerpAPI
   - Yields `{type: 'sources'}` once they're ready
   - Streams the LLM response, yielding `{type: 'token'}` per chunk (server filters out the `## RATINGS` metadata block before emitting so the client never sees it)
   - Yields `{type: 'done'}` with rated sources + parsed answer
6. Client smooths the typing via a `requestAnimationFrame` loop — chars-per-frame scales with backlog so big bursts don't look choppy.
7. On `done`, the result is written to localStorage so reloads return instantly.

## Key engineering decisions

### tRPC subscription over SSE for streaming

The spec hints at this with "procedure (or streaming procedure)." tRPC v11 supports subscriptions over Server-Sent Events out of the box — `splitLink` routes subscription ops to `httpSubscriptionLink` (SSE), everything else to `httpBatchLink`. Server defines `.subscription(async function*() { yield... })`, client uses `useSubscription({ onData })`.

Common Alternatives I decided against:
- **Vercel AI SDK** — great DX but bypasses tRPC. Felt like dodging what the spec is testing.
- **Raw Next.js streaming route handler** — works but creates a split-brain (tRPC for queries, raw HTTP for streaming).
- **WebSockets via `wsLink`** — overkill for one-way short-lived streams, plus Next.js doesn't natively run WebSocket servers in API routes.

SSE via tRPC keeps the architecture coherent and the types end-to-end safe.

### LLM as the credibility classifier (no hardcoded list)

First pass was a hardcoded list of "official" and "trusted" domains. Two problems:
1. Doesn't scale — I picked obvious US/English finance sources. Misses everything else.
2. Static ratings throw away context. `sec.gov` is highly credible for *"what is the Investment Advisers Act"*, much less so for *"best places to eat in DC"*.

So instead, the system prompt asks the LLM to rate each source contextually for the question, in a structured tail block:

```
## RATINGS
[1]: official - SEC.gov is the primary regulatory source for this question
[2]: trusted - Established financial publisher with editorial standards
[3]: other - Personal blog with no editorial oversight
```

Parsed server-side, merged onto sources, rendered as badges in the expanded sources panel.

Tradeoffs:
- Scales infinitely, leverages an LLM call we're already making
- Per-question context — the same domain can be "official" for one search and "other" for another
- LLM might emit malformed output. Parser is lenient and the UI degrades gracefully (no badge if missing)

### Server-side filtering of the ratings block from the stream

If the raw LLM output were streamed verbatim, the user would briefly see `## RATINGS\n[1]: official...` flash at the end before being replaced. Ugly.

The subscription procedure holds back the trailing N chars (sentinel length) while watching for `## RATINGS`. As soon as the sentinel appears, it stops emitting tokens. Client never sees the metadata.

### UUID URLs instead of `?q=` query strings

`/search/abc-123-uuid` instead of `/search?q=who+is+trump`.

- Stable IDs survive renames (you can rename a history entry without changing the URL)
- Keeps the question out of the URL bar (cleaner share)
- Mirrors Perplexity

The id → query mapping lives in localStorage. A real product would persist this server-side.

### Persistent answer cache with TTL

React Query caches in memory only — reload and it's gone. Added a small localStorage cache keyed by question *content* (not UUID, so the same question across two history entries shares one cache entry). 1-hour TTL because some questions go stale fast ("what stocks are up today" shouldn't return yesterday's answer).

`useQuery` accepts `initialData` + `initialDataUpdatedAt`, so cache hits skip the API call entirely until the TTL passes.

### Errors mapped to semantic tRPC codes

- `BAD_REQUEST` — Zod rejects whitespace-only / too-long input before the procedure runs
- `NOT_FOUND` — `NoSourcesError` thrown when SerpAPI returns nothing
- `INTERNAL_SERVER_ERROR` — anything else (bug in our code, upstream provider failure)

Client can branch on the code to render specific UIs (currently we just show the message; the wiring is there for later).

### `createContext` stub even though we don't need it rn

`server/context.ts` exports an empty `createContext`. tRPC convention. Currently returns `{}`, but it's the right place for `auth`, `db`, `requestId`, etc. when those land. Means adding them later is a one-file change instead of touching every procedure.

### LLM provider fallback chain

Pipeline tries Anthropic first, falls back to Groq on error. Streaming uses the same chain. Both providers honor the same system prompt and emit the same `## RATINGS` format.

Why both: Anthropic quality is higher for some questions, but their billing throws "credit balance too low" errors that aren't always recoverable. Groq's free tier removes the friction.

## Server vs client component split

`app/page.tsx`, `app/search/[id]/page.tsx`, `app/layout.tsx` are server components — never ship JS for the static parts. The client subtree starts at `<SearchResults>` because that's the smallest unit that needs interactivity (subscription, state machine, citation click handlers). Everything else is on the server.

## Design

`DESIGN.md` documents the visual system. Highlights:
- One typeface family (Geist + Geist Mono). Hierarchy from weight, not from changing fonts.
- Warm-neutral palette with a single muted sage accent.
- Light + dark themes — default by local time (dark 7pm-7am, light otherwise), explicit toggle persists in localStorage and overrides the time-based default.
- Three motion moments: source card fade-rise, citation chip hover, sidebar width transition. Plus the answer-streaming caret + status shimmer.

## What I cut

- **Multi-turn conversation threading.** Real rebuild of data model + routing. Spec is single-shot Q&A for purposes of this take home.
- **Image / file upload (multimodal).** Voice and vision-capable model + storage + UI. Out of scope.
- **Inline stock charts on fintech questions.** Real-time price data + chart library + ticker recognition is its own project.
- **Server-side persistence.** localStorage covers the demo. A real product needs a DB.

## What I'd do next

- Real auth + per-user history in a database (so search links are shareable across users)
- Streaming source ratings (currently rated only at the end; could rate as each source is read)
- "As of [timestamp]" badge on time-sensitive answers
- Semantic dedup — embed the question, hit cache for similar questions
- Threaded follow-up questions, LLM-aware of previous Q&A
- Better retrieval — fetch the actual source pages and feed the LLM more than just SerpAPI snippets

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run typecheck` — validate types without emitting JS
- `npm run lint` — Next.js lint