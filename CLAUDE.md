# CLAUDE.md — CarFit project guide

Working doc for future Claude Code sessions on this repo. Short. Read this before touching code.

---

## Project goal

CarFit helps clueless car buyers in India choose a car. Pick a persona ("New parent in metro", "Highway commuter", etc.), see a curated 3-car shortlist matched to your needs, and on each car detail page watch curated YouTube reviews and read articles from trusted media houses — all in one place. The thesis is conversion-through-trust: surfacing real reviewer opinions in-app cuts the bounce-to-Google that kills aggregator conversion.

---

## The contract

**Types in [`lib/types.ts`](./lib/types.ts) are the single source of truth.**
Never let the DB schema, JSON seed files, UI props, or API responses drift from these types. The contract includes `ListMeta = { limit, total, hasMore }` and `MatchResponse.meta: ListMeta` — when you add a paginated list endpoint, reuse that envelope rather than minting a new one. If you change a field, audit:

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
  personas/[id]/page.tsx    Shortlist (RSC; reads searchParams, merges over persona.preferences, calls matcher)
  cars/[id]/page.tsx        Detail + media + lead form (RSC + 'use client' form; mounts <RecordView>)
  compare/page.tsx          Side-by-side compare ('use client'; reads localStorage, fetches via /api/cars/[id])
  api/
    personas/route.ts       GET; { personas, count }, Cache-Control
    match/route.ts          POST; accepts limit (default 24, max 100); response carries meta: ListMeta
    cars/[id]/route.ts      GET; pure read (zod-validated slug, Cache-Control); no view side-effect
    views/route.ts          POST; sole writer for view counts
    leads/route.ts          POST; personaId is .nullish() — anonymous leads OK
components/
  PersonaCard.tsx
  CarCard.tsx
  MatchScoreBadge.tsx
  PrefChips.tsx
  WhyThisCar.tsx            (per-criterion ✓/✗ list)
  MediaEmbed.tsx            (YouTube + article)
  LeadForm.tsx              ('use client')
  CompareButton.tsx         ('use client'; add/remove a car from the cart)
  CompareCart.tsx           ('use client'; header pill, live count)
  PersonaTweakPanel.tsx     ('use client'; writes URL searchParams, server re-ranks)
  RecordView.tsx            ('use client'; one POST /api/views on mount, ref-guarded)
data/
  personas.json             12 hand-authored entries (incl. flexibility[] per persona)
  cars.json                 ~30 hand-authored entries
  app.db                    gitignored; auto-seeded
lib/
  types.ts                  THE CONTRACT (incl. Persona.flexibility, ListMeta, MatchResponse.meta)
  db.ts                     better-sqlite3 + schema (server-only)
  seed.ts                   JSON → SQLite (server-only)
  repo.ts                   ALL DB access goes here (server-only)
  matcher.ts                Persona → MatchResult[] (server-only; honors flexibility via FLEX_SCALE = 0.5)
  llm.ts                    Mock LLM, V2 placeholder (server-only)
  compare-store.ts          localStorage wrapper for the compare cart (client-only; SSR-safe)
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
- **Client-side cross-component state: prefer a small typed wrapper around `localStorage` with a custom window event** (see `lib/compare-store.ts`). No React context, no global singleton; the store is the source of truth, components subscribe.
- **URL `searchParams` are the canonical source for view-state on server-rendered pages** (see `app/personas/[id]/page.tsx`). Don't mirror them into client state — let the server read and re-render.
- **Read endpoints carry `Cache-Control: public, max-age=60, stale-while-revalidate=300`** so RSC fetches and CDN edges don't stampede the origin. Writes (`/api/leads`, `/api/views`) are uncached and zod-validated. Each route file opens with a one-line `Status: real / mocked` header that cross-references the matching `docs/FEATURES.md` section.

---

## Anti-patterns to avoid

- **Importing `better-sqlite3` (or anything from `lib/`) in a client component.** It's a native module; it'll explode the build. The `'server-only'` guards exist to fail fast.
- **Bypassing `lib/repo.ts`.** Calling `getDb().prepare(...)` from a route or page short-circuits the chokepoint that makes the Turso/Postgres swap a one-file change.
- **Adding a top-level dep without justification.** The dep list is intentionally tiny (`next`, `react`, `react-dom`, `better-sqlite3`, `zod`). Anything new needs a one-line rationale in the PR.
- **Pushing without `npm run build` passing locally.** `next build` catches RSC/client boundary violations and type drift; CI without local checks wastes deploy slots.
- **Letting `lib/types.ts` drift from `data/*.json`.** If you add a field to the type, add it to every JSON entry; if you make a field optional, keep the matcher's `undefined` handling sound. The seeder will silently `JSON.stringify` anything — you won't get a runtime error until a query reads the bad row.
- **Persisting anything important to SQLite on Vercel.** `/tmp` is ephemeral. Treat the deploy as a demo until the Turso/Postgres swap.
- **Running the matcher on the client.** Keep it server-side; it's the contract for ranking. The tweak panel writes URL params and the server re-ranks — don't shortcut it with a client-side recompute.
- **Folding writes into a GET handler.** RSC `<Link>` prefetches, the `/compare` fan-out, CDN warmups, and health checks all hit GETs without representing real users — analytics tied to a GET will inflate. Writes go to a POST endpoint; if a write needs to fire on render, mount a small client component à la `components/RecordView.tsx` (single `useEffect` + `useRef` guard, silent failure).

---

## Common tasks

### Add a persona
1. Append an entry to `data/personas.json` matching the `Persona` type. Set `flexibility` (optional but recommended) — list which preferences this persona is willing to negotiate on; the matcher halves their weight via `FLEX_SCALE`.
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

### Add a tweak control to the persona panel
1. Add the input to `components/PersonaTweakPanel.tsx`. Read its current value from `useSearchParams()` (with the persona default as fallback) and write via `pushParams((p) => p.set(...))`.
2. Extend the URL key parser in `app/personas/[id]/page.tsx` (`parseOverrides`) with validation. Mirror the patterns there — clamp / enum-check / drop on invalid; never trust the URL.
3. Rely on the existing matcher — it consumes whatever's in the merged `tweakedPersona.preferences`. No matcher edit needed unless the new field is a new criterion.

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

Quick map: persona catalog (mocked, 12 hand-authored entries with `flexibility` lists), car catalog (mocked), YouTube IDs (synthetic placeholders), article URLs (unverified), lead capture (SQLite, no CRM, no SMS, no auth), view aggregation (SQLite, no bot filter), compare cart (localStorage, not synced), persona tweaks (URL-only, not persisted), LLM intake (deterministic keyword stub, not wired into UI).
