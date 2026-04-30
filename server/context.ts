import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

// Per-request context for tRPC. Empty right now since this app has no auth,
// no db or anything to inject. Keeping the factory anyway as trpc discipline lol and ease
// of adding later (one-file change instead of touching every procedure.)
export async function createContext(_opts: FetchCreateContextFnOptions) {
  return {
    // user: await getUserFromCookies(opts.req),
    // db: dbConnection,
    // requestId: opts.req.headers.get("x-request-id") ?? crypto.randomUUID(),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;