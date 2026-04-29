import Anthropic from "@anthropic-ai/sdk";
import type { Source } from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;

export async function generateAnswer(query: string, sources: Source[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const client = new Anthropic({ apiKey });

  const sourcesBlock = sources
    .map((s) => `[${s.id}] ${s.title} (${s.domain})\n${s.snippet}`)
    .join("\n\n");

  const system = `You are a careful research assistant. Answer the user's question using ONLY the provided sources. Cite every factual claim inline using bracketed numbers like [1] or [2, 3]. Use the same numbering as the sources. If the sources do not answer the question, say so honestly. Keep answers tight and well-structured. Use short paragraphs. Do not use headings unless the answer is long.`;

  const user = `Question: ${query}\n\nSources:\n${sourcesBlock}\n\nAnswer the question now, citing inline.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return text.trim();
}
