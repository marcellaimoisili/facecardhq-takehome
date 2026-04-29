# Design System

A Perplexity-style search and answer interface. Calm modern, warm minimalism, content-forward. Familiar mental model, distinguished by restraint.

## Aesthetic

- Direction: Calm Modern. Warm minimalism, content-forward, single accent.
- Mood: confident, calm, respects the reader's attention. Not playful or corporate.
- One typeface family. Hierarchy from weight and size.

## Color

Warm neutrals with a single muted accent. Both themes share the same accent hue, brightened slightly in dark mode for contrast.

### Light

| Role | Hex | Notes |
|---|---|---|
| Background | `#FAFAF7` | Warm off-white, not sterile |
| Surface | `#FFFFFF` | Cards, sticky search header |
| Ink | `#111111` | Primary text |
| Ink muted | `#6F6E68` | Meta, timestamps, source domain |
| Border | `#ECE9E2` | Hairline, warm |
| Border hover | `#D9D5CB` | Hover state for cards |
| Accent | `#3F6B4E` | Primary action, link underline, citation chip |
| Accent ink | `#FFFFFF` | Text on accent |
| Error | `#B23A3A` | Desaturated to match palette |

### Dark

| Role | Hex | Notes |
|---|---|---|
| Background | `#14140F` | Warm near-black, not pitch |
| Surface | `#1C1C16` | Slightly lifted; cards, sticky header |
| Ink | `#ECE9E2` | Off-white, not pure |
| Ink muted | `#8A8980` | Warm gray |
| Border | `#2A2A22` | Warm hairline |
| Border hover | `#3A3A2F` | Hover state for cards |
| Accent | `#6FA882` | Brighter sage for contrast |
| Accent ink | `#0F0F0B` | Dark ink on accent |
| Error | `#D67373` | Brighter for contrast |

Theme switching: class-based on `<html>` (`light` / `dark`). Respect `prefers-color-scheme` on first visit, then user toggle persists in `localStorage`.

## Typography

- One family: **Geist** (sans) + **Geist Mono** (citations, source URLs, any data).
- Load via `next/font/google` in `app/layout.tsx`.
- Body 16px, line-height 1.6, max measure ~72ch on the answer column.
- Headings use weight (500, 600), tight tracking, no display serif.
- Numbers in source meta and citation chips use `font-variant-numeric: tabular-nums`.

| Role | Family | Size | Weight | Line height |
|---|---|---|---|---|
| Hero placeholder | Geist | 18px | 400 | 1.4 |
| Page title | Geist | 28px | 600 | 1.2 |
| Answer body | Geist | 16px | 400 | 1.6 |
| Source title | Geist | 14px | 500 | 1.4 |
| Source meta | Geist Mono | 12px | 400 | 1.4 |
| Citation chip | Geist Mono | 11px | 500 | 1 |

## Spacing

- Base unit: 4px.
- Tailwind defaults are fine: `1` (4) `2` (8) `3` (12) `4` (16) `6` (24) `8` (32) `12` (48) `16` (64).
- Generous vertical rhythm between answer, sources, follow-ups.

## Layout

- **First impression:** centered hero. Search input vertically centered, generous whitespace, single suggestion row beneath.
- **After query:** sticky compact search at the top, sources row, then answer with inline citations, then follow-up suggestions.
- Single column for the answer, max ~72ch.
- Mobile: same single column, sources row scrolls horizontally.

## Components

### Search input
- Pill shape, `rounded-full`, 1px border `#ECE9E2`, white surface.
- Focus ring: 2px sage at 20% opacity, no harsh outline.
- Submit button: arrow icon, sage filled circle on hover/focus.

### Source card
- Surface, 1px border, `rounded-xl`, padding `16px`.
- Favicon (16px) + domain in mono small + title in 14px medium.
- Hover: border darkens to `#D9D5CB`, no lift, no shadow.

### Citation chip (inline)
- Tiny pill, sage background, white text, mono numerals.
- Click jumps to the corresponding source card.
- Hover: very subtle scale (1.05), no movement.

### Answer body
- Reads like a short article. Paragraphs, occasional list, citations as inline chips.
- Streaming text with a thin sage caret at the trailing edge.

## Motion

Three signature moments. That is the whole budget.

1. Streaming text reveal on the answer (table stakes, but the caret styling matters).
2. Source cards fade-and-rise on first stream (50ms stagger, 8px distance, ease-out, 200ms).
3. Citation chip hover: 1.05 scale + slight bg darken. No movement.

No scroll-driven anything. No bouncy cards. Everything else is `transition-colors` only.

## Borders, radii, shadows

- Border radius: `rounded-md` (6px) for inputs, `rounded-xl` (12px) for cards, `rounded-full` for the search pill and citation chips.
- Shadows: none by default. The design works on hairline borders. If a shadow is ever needed, use `0 1px 2px rgba(0,0,0,0.04)`.

## What this design system says no to

- Purple, violet, indigo gradients
- Three-column icon-grid feature sections
- Centered-everything walls of text
- Decorative blobs, wavy SVG dividers, floating circles
- Emoji as design elements
- Two display fonts pretending to be a system
- Drop shadows as the primary depth signal
