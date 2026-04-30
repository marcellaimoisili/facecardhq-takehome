import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { NoSourcesError, runSearch } from "../search/run";
import { fetchSources } from "../search/serp";
import { parseLLMResponse, streamAnswer } from "../search/llm";

// Input schema is shared between run + stream.
const searchInput = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Enter a question")
    .max(500, "Question too long"),
});

export const searchRouter = router({
  // Non-streaming. Used when we have a cached answer (instant return) or as
  // a fallback if the client doesn't want SSE.
  run: publicProcedure.input(searchInput).query(async ({ input }) => {
    try {
      return await runSearch(input.query);
    } catch (err) {
      if (err instanceof NoSourcesError) {
        throw new TRPCError({ code: "NOT_FOUND", message: err.message });
      }
      const message = err instanceof Error ? err.message : "Search failed";
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
    }
  }),

  // Streaming via SSE. Yields a discriminated union the client matches on:
  //   { type: 'sources' }  — sent once SerpAPI returns
  //   { type: 'token' }    — sent for every chunk from the LLM
  //   { type: 'done' }     — final event with rated sources + parsed answer
  stream: publicProcedure
    .input(searchInput)
    .subscription(async function* ({ input, signal }) {
      const sources = await fetchSources(input.query);
      if (sources.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No sources found for "${input.query}". Try rephrasing.`,
        });
      }

      yield { type: "sources" as const, sources };

      // Hold back the trailing chars while we watch for "## RATINGS". As soon
      // as the sentinel appears, stop emitting text — the rest is metadata
      // the client doesn't render. This avoids flashing "## RATINGS\n[1]:..."
      // briefly before the done event replaces it.
      const SENTINEL = "## RATINGS";
      let raw = "";
      let emittedUpTo = 0;
      let stopped = false;

      for await (const chunk of streamAnswer(input.query, sources)) {
        if (signal?.aborted) return;
        raw += chunk;
        if (stopped) continue;

        const sentinelIdx = raw.indexOf(SENTINEL);
        if (sentinelIdx >= 0) {
          // Emit the text before the sentinel that we haven't sent yet.
          if (sentinelIdx > emittedUpTo) {
            yield { type: "token" as const, text: raw.slice(emittedUpTo, sentinelIdx) };
            emittedUpTo = sentinelIdx;
          }
          stopped = true;
        } else {
          // Keep a buffer of (SENTINEL.length - 1) chars in case the sentinel
          // is being assembled across chunks. Anything older than that is safe.
          const safeLength = raw.length - (SENTINEL.length - 1);
          if (safeLength > emittedUpTo) {
            yield { type: "token" as const, text: raw.slice(emittedUpTo, safeLength) };
            emittedUpTo = safeLength;
          }
        }
      }

      // Stream finished. Parse the ratings block and emit the cleaned answer
      // + rated sources.
      const { answer, ratings } = parseLLMResponse(raw);
      const ratedSources = sources.map((s) => ({
        ...s,
        tier: ratings.get(s.id),
      }));
      yield { type: "done" as const, sources: ratedSources, finalAnswer: answer };
    }),
});
