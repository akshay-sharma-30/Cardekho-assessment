# CLAUDE.md — CarFit project guide

Working doc for future Claude Code sessions on this repo. Short. Read this before touching code.

---

## Project goal

CarFit helps clueless car buyers in India choose a car. Pick a persona ("New parent in metro", "Highway commuter", etc.), see a curated 3-car shortlist matched to your needs, and on each car detail page watch curated YouTube reviews and read articles from trusted media houses — all in one place. The thesis is conversion-through-trust: surfacing real reviewer opinions in-app cuts the bounce-to-Google that kills aggregator conversion.

---

## The contract

**Types in [`lib/types.ts`](./lib/types.ts) are the single source of truth.**
Never let the DB schema, JSON seed files, UI props, or API responses drift from these types. If you change a field, audit:

1. `lib/types.ts` — the type itself.
2. `data/personas.json` / `data/cars.json` — seed data.
3. `lib/db.ts` — schema (or JSON-blob columns).
4. `lib/seed.ts` — `rowToPersona` / `rowToCar` hydrators.
5. `lib/repo.ts` — any new query.
6. Components consuming the type.
7. API route handlers and their zod schemas.

A drift here is the highest-cost bug class in this codebase.

---

## Where everything lives

```
app/
  page.tsx                  Persona picker (RSC)
  personas/[id]/page.tsx    Shortlist (RSC; calls matcher)
  cars/[id]/page.tsx        Detail + media + lead form (RSC + 'use client' form)
  api/
    personas/route.ts
    match/route.ts
    cars/[id]/route.ts
    views/route.ts
    leads/route.ts
components/
  PersonaCard.tsx
  CarCard.tsx
  MatchScoreBadge.tsx
  PrefChips.tsx
  WhyThisCar.tsx            (per-criterion ✓/✗ list)
  MediaEmbed.tsx            (YouTube + article)
  LeadForm.tsx              ('use client')
data/
  personas.json             6 hand-authored entries
  cars.json                 ~30 hand-authored entries
  app.db                    gitignored; auto-seeded
lib/
  types.ts                  THE CONTRACT
  db.ts                     better-sqlite3 + schema (server-only)
  seed.ts                   JSON → SQLite (server-only)
  repo.ts                   ALL DB access goes here (server-only)
  matcher.ts                Persona → MatchResult[] (server-only)
  llm.ts                    Mock LLM, V2 placeholder (server-only)
docs/
  FEATURES.md               Mock vs real
  ARCHITECTURE.md           Data flow, schema, API, recipes
README.md
CLAUDE.md                   ← you are here
```

---

## Conventions

- **Tailwind only.** No shadcn, no headless UI, no Radix. Keep `tailwind.config.ts` as the only design system.
- **Server components by default.** Add `'use client'` only when the component needs interactivity (state, effects, event handlers). Today only `LeadForm.tsx` qualifies.
- **`import 'server-only'`** at the top of every file in `lib/` that touches the DB or filesystem (`db.ts`, `seed.ts`, `repo.ts`, `matcher.ts`, `llm.ts` if it ever calls a network API). This is your guard against accidental client bundling.
- **All DB access goes through `lib/repo.ts`.** Never call `getDb()` from API routes or pages. If you need a new query, add a method to `repo` and reuse it.
- **All API input is validated with zod.** Define the schema next to the route handler. Return `400` with the `ZodError.issues` on failure.
- **JSON-blob columns** (`personas.data`, `cars.data`) are an intentional pragmatic choice — don't normalize them out without a reason. Hydrate via `rowToPersona` / `rowToCar` in `lib/seed.ts`.

---

## Anti-patterns to avoid

- **Importing `better-sqlite3` (or anything from `lib/`) in a client component.** It's a native module; it'll explode the build. The `'server-only'` guards exist to fail fast.
- **Bypassing `lib/repo.ts`.** Calling `getDb().prepare(...)` from a route or page short-circuits the chokepoint that makes the Turso/Postgres swap a one-file change.
- **Adding a top-level dep without justification.** The dep list is intentionally tiny (`next`, `react`, `react-dom`, `better-sqlite3`, `zod`). Anything new needs a one-line rationale in the PR.
- **Pushing without `npm run build` passing locally.** `next build` catches RSC/client boundary violations and type drift; CI without local checks wastes deploy slots.
- **Letting `lib/types.ts` drift from `data/*.json`.** If you add a field to the type, add it to every JSON entry; if you make a field optional, keep the matcher's `undefined` handling sound. The seeder will silently `JSON.stringify` anything — you won't get a runtime error until a query reads the bad row.
- **Persisting anything important to SQLite on Vercel.** `/tmp` is ephemeral. Treat the deploy as a demo until the Turso/Postgres swap.

---

## Common tasks

### Add a persona
1. Append an entry to `data/personas.json` matching the `Persona` type.
2. `rm data/app.db` (locally) so the seeder re-runs.
3. `npm run dev` — verify the new tile on `/` and the shortlist on `/personas/<new-id>`.

### Add a car
1. Append an entry to `data/cars.json` matching the `Car` type. Include at least 2 `media[]` entries.
2. `rm data/app.db` and restart.
3. Visit `/cars/<new-id>`, sanity-check media + lead form.

### Add a new API route
1. Create `app/api/<name>/route.ts`.
2. Define a zod schema next to the handler. Parse the body / query — never trust input.
3. Call `repo.<method>` — never `getDb()` directly.
4. Return JSON. On zod failure return `400` with `{ errors: result.error.issues }`.

### Swap to a real LLM
1. Keep `lib/llm.ts`'s exported `LLMProvider` interface unchanged.
2. Replace `mockLLM` body with an `@anthropic-ai/sdk` call (Haiku for cost, Sonnet for quality) using a structured-output schema that matches `Persona['preferences']`.
3. Keep `mockLLM` available as a fallback when `process.env.LLM_PROVIDER === 'mock'` (CI, offline tests).
4. The matcher and UI stay untouched — that's the whole reason the interface exists today.

### Reset the local DB
```bash
rm data/app.db
npm run dev
```
The next read through `repo` re-seeds from JSON.

---

## Mocked layers

Every external integration is stubbed in the MVP. Full ledger, with the production-version recipe for each, in [`docs/FEATURES.md`](./docs/FEATURES.md).

Quick map: persona catalog (mocked), car catalog (mocked), YouTube IDs (synthetic placeholders), article URLs (unverified), lead capture (SQLite, no CRM, no SMS, no auth), view aggregation (SQLite, no bot filter), LLM intake (deterministic keyword stub, not wired into UI).
