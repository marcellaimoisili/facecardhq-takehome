import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import type { Source, Tier } from "./types";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = `You are a careful research assistant. Answer the user's question using ONLY the provided sources.

Rules for the answer:
- Cite every factual claim inline using bracketed numbers like [1] or [2, 3]. Use the same numbering as the sources block.
- If the sources do not answer the question, say so honestly in one sentence.
- Write in plain prose. Do NOT use markdown formatting: no **bold**, no _italic_, no headings, no bullet lists, no numbered lists, no code blocks.
- Use short paragraphs separated by a blank line. Two to four paragraphs total is usually enough.
- Be tight. No filler, no preamble like "Based on the sources...", just the answer.

After the answer, on its own line, output exactly "## RATINGS" followed by one line per source in this exact format:
[N]: tier - one-sentence reason

Where tier is exactly one of: official, trusted, other.
- official: government, regulator, primary source, peer-reviewed academic, or the entity being discussed publishing about itself
- trusted: established publisher with editorial standards (Bloomberg, FT, Reuters, WSJ, BBC, Wikipedia, Britannica, trusted newspapers)
- other: blogs, forums, niche sites, marketing pages, anything else

Rate each source's credibility CONTEXTUALLY — for THIS specific question. A source might be "official" for one topic and "other" for another.

Example final block:
## RATINGS
[1]: official - Direct SEC filing, primary regulatory source for this question
[2]: trusted - Established financial publisher with editorial standards
[3]: other - Personal blog with no editorial oversight`;

export type LLMResponse = {
  answer: string;
  /** Map of source id → tier. Sources missing from the map have no rating. */
  ratings: Map<number, Tier>;
};

// Stream raw LLM tokens. Caller accumulates and parses with parseLLMResponse
// once the stream finishes. Same provider fallback as generateAnswer.
export async function* streamAnswer(
  query: string,
  sources: Source[],
): AsyncGenerator<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      yield* streamAnthropic(query, sources);
      return;
    } catch (err) {
      console.warn(
        "[llm] Anthropic streaming failed, falling back to Groq:",
        err instanceof Error ? err.message : err,
      );
    }
  }
  if (process.env.GROQ_API_KEY) {
    yield* streamGroq(query, sources);
    return;
  }
  throw new Error(
    "No LLM provider configured. Set ANTHROPIC_API_KEY or GROQ_API_KEY in .env.local.",
  );
}

async function* streamAnthropic(
  query: string,
  sources: Source[],
): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const userMessage = buildUserMessage(query, sources);

  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

async function* streamGroq(
  query: string,
  sources: Source[],
): AsyncGenerator<string> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  const userMessage = buildUserMessage(query, sources);

  const stream = await client.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/**
 * Generate an answer with citations and per-source credibility ratings.
 * Tries providers in order: Anthropic (preferred) → Groq (free fallback).
 */
export async function generateAnswer(
  query: string,
  sources: Source[],
): Promise<LLMResponse> {
  const errors: string[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const raw = await callAnthropic(query, sources);
      return parseLLMResponse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`anthropic: ${msg}`);
      console.warn("[llm] Anthropic failed, falling back:", msg);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const raw = await callGroq(query, sources);
      return parseLLMResponse(raw);
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

async function callAnthropic(query: string, sources: Source[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const userMessage = buildUserMessage(query, sources);

  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");
}

async function callGroq(query: string, sources: Source[]): Promise<string> {
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

  return completion.choices[0]?.message?.content ?? "";
}

function buildUserMessage(query: string, sources: Source[]): string {
  const sourcesBlock = sources
    .map((s) => `[${s.id}] ${s.title} (${s.domain})\n${s.snippet}`)
    .join("\n\n");
  return `Question: ${query}\n\nSources:\n${sourcesBlock}\n\nAnswer the question now, citing inline. Then output the ## RATINGS block.`;
}

const RATINGS_DELIMITER = /\n\s*##\s*RATINGS\s*\n/i;
const RATING_LINE = /^\s*\[(\d+)\]\s*:\s*(official|trusted|other)\b/i;

/**
 * Parse the LLM's combined answer + ratings response. The ratings block is
 * optional — if it's missing or unparseable, we return an empty ratings map
 * and the UI shows no badges (graceful degradation).
 */
export function parseLLMResponse(raw: string): LLMResponse {
  const trimmed = raw.trim();
  const split = trimmed.split(RATINGS_DELIMITER);
  const answer = split[0].trim();
  const ratings = new Map<number, Tier>();

  if (split.length > 1) {
    for (const line of split[1].split("\n")) {
      const m = line.match(RATING_LINE);
      if (!m) continue;
      const id = Number.parseInt(m[1], 10);
      const tier = m[2].toLowerCase() as Tier;
      if (Number.isFinite(id)) ratings.set(id, tier);
    }
  }

  return { answer, ratings };
}
