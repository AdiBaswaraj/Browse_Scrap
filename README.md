# Project Fyndra

Agentic research & scraping workspace. Type a query, watch 20–40 sources get scraped concurrently, and explore the synthesized results as a real-time sticker grid with comparison matrix, charts, and flow diagrams.

## Stack

- **apps/web** — Next.js 15 (App Router), Tailwind, Framer Motion, Recharts, React Flow
- **apps/worker** — Bun + BullMQ
- **packages/shared** — Zod schemas, Supabase clients, job types
- **Supabase** — Postgres + Realtime + (pgvector reserved for v1.1)
- **Redis** — BullMQ queue backend
- **DeepSeek-V4** (primary) / **GPT-4o-mini** (fallback) — planning, extraction, synthesis
- **Firecrawl** / **Bright Data residential** / **Browserless** — multi-tool scraping

## Quickstart

```bash
cp .env.example .env
# fill in keys
bun install

# apply DB schema (uses Supabase CLI; alternatively paste supabase/migrations/0001_init.sql into the SQL editor)
supabase db push

# two terminals
bun run dev:worker
bun run dev:web
```

Open http://localhost:3000.

## Pipeline

`plan → scrape (Firecrawl / Bright Data / Browserless) → extract → dedupe_merge → visualize`

See `/root/.claude/plans/this-is-basic-plan-wiggly-moonbeam.md` for the full design doc.
