import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { runSearch } from "../search/run";

export const searchRouter = router({
  /**
   * Run a search: fetch sources from SerpAPI + generate an answer with the LLM.
   * Modeled as a query (not mutation) because:
   *   - The URL `?q=...` is the input; the result is deterministic per input.
   *   - React Query will cache by input, so revisiting a past query is instant.
   *   - Each call is a read of "what's the answer to X" — no server-side side effect.
   */
  run: publicProcedure
    .input(
      z.object({
        query: z
          .string()
          .trim()
          .min(1, "Enter a question")
          .max(500, "Question too long"),
      }),
    )
    .query(async ({ input }) => {
      try {
        return await runSearch(input.query);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        // INTERNAL_SERVER_ERROR is correct here: the user's input was valid (Zod
        // already accepted it) but a downstream service (SerpAPI / LLM) failed.
        // BAD_REQUEST would be wrong because it implies the *user* did something wrong.
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
