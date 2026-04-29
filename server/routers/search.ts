import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { runSearch } from "../search/run";

export const searchRouter = router({
  run: publicProcedure
    .input(
      z.object({
        query: z.string().min(1, "Enter a question").max(500, "Question too long"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await runSearch(input.query);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
