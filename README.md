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
# 1. Env files
cp .env.example .env                   # used by the worker (Bun auto-loads from repo root)
cp .env.example apps/web/.env.local    # used by Next.js (only reads env from the app dir)
# fill in keys in BOTH files (or just .env — next.config.ts falls back to it)

# 2. Dependencies
bun install

# 3. DB schema — paste supabase/migrations/0001_init.sql into the Supabase SQL editor
#    (or `supabase db push` if you have the CLI linked)

# 4. Two terminals
bun run dev:worker
bun run dev:web
```

Open http://localhost:3000.

### Required env vars

| Var | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web (browser) | Realtime client |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | web (server actions) + worker | DB writes |
| `REDIS_URL` | web (enqueue) + worker | BullMQ; use `rediss://` for TLS |
| `DEEPSEEK_API_KEY` | worker | Primary LLM |
| `OPENAI_API_KEY` | worker | Fallback LLM |
| `FIRECRAWL_API_KEY` | worker | Default scraper |
| `BRIGHTDATA_API_KEY` | worker | Bot-protected sites |
| `BROWSERLESS_API_KEY` | worker | JS-heavy sites |

## Pipeline

`plan → scrape (Firecrawl / Bright Data / Browserless) → extract → dedupe_merge → visualize`

See `/root/.claude/plans/this-is-basic-plan-wiggly-moonbeam.md` for the full design doc.
