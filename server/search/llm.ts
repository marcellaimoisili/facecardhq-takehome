import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import type { Source } from "./types";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are a careful research assistant. Answer the user's question using ONLY the provided sources.

Rules:
- Cite every factual claim inline using bracketed numbers like [1] or [2, 3]. Use the same numbering as the sources block.
- If the sources do not answer the question, say so honestly in one sentence.
- Write in plain prose. Do NOT use markdown formatting: no **bold**, no _italic_, no headings, no bullet lists, no numbered lists, no code blocks.
- Use short paragraphs separated by a blank line. Two to four paragraphs total is usually enough.
- Be tight. No filler, no preamble like "Based on the sources...", just the answer.`;

/**
 * Generate an answer with citations. Tries providers in order and falls back
 * on error. Order: Anthropic (preferred) → Groq (free-tier fallback).
 */
export async function generateAnswer(query: string, sources: Source[]): Promise<string> {
  const errors: string[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await generateWithAnthropic(query, sources);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`anthropic: ${msg}`);
      console.warn("[llm] Anthropic failed, falling back:", msg);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await generateWithGroq(query, sources);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`groq: ${msg}`);
    }
  }

  if (errors.length === 0) {
    throw new Error(
      "No LLM provider configured. Set ANTHROPIC_API_KEY or GROQ_API_KEY in .env.local.",
    );
  }
  throw new Error(`All LLM providers failed. ${errors.join(" | ")}`);
}

async function generateWithAnthropic(query: string, sources: Source[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const userMessage = buildUserMessage(query, sources);

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return text.trim();
}

async function generateWithGroq(query: string, sources: Source[]): Promise<string> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const userMessage = buildUserMessage(query, sources);

  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  return text.trim();
}

function buildUserMessage(query: string, sources: Source[]): string {
  const sourcesBlock = sources
    .map((s) => `[${s.id}] ${s.title} (${s.domain})\n${s.snippet}`)
    .join("\n\n");
  return `Question: ${query}\n\nSources:\n${sourcesBlock}\n\nAnswer the question now, citing inline.`;
}
