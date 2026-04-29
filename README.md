# CarFit

**Needs-first car discovery for clueless Indian buyers.**

CarFit helps clueless car buyers in India choose a car. Pick a persona ("New parent in metro", "Highway commuter", etc.), tweak the fit if you want, see a curated 3-car shortlist matched to your needs, add a few to compare side-by-side, and on each car detail page watch curated YouTube reviews and read articles from trusted media houses — all in one place. The thesis is conversion-through-trust: surfacing real reviewer opinions in-app cuts the bounce-to-Google that kills aggregator conversion.

---

## 30-second demo flow

Pick a persona → tweak the fit if you want → see 3 cars → add a few to compare → watch curated reviews → book a test drive.

1. Land on `/` → pick one of 12 lifestyle personas.
2. `/personas/[id]` → see a transparent 3-car shortlist with per-criterion match breakdown. Open the **Tweak panel** to override budget / seats / transmission / fuels / safety floor; the list re-ranks live.
3. Hit **+ Compare** on any card to drop it in the cart (max 3); `/compare` renders a side-by-side spec table.
4. `/cars/[id]` → watch 2-3 embedded reviews, read articles from PowerDrift / Autocar / CarWale.
5. Submit a test-drive / callback request without leaving the page.

---

## Features

- **Persona-based discovery** — 12 lifestyle tiles → 3-car shortlist with per-criterion match breakdown.
- **Curated reviews on the detail page** — 2-3 embedded YouTube reviews + articles from trusted Indian media.
- **Lead capture** — single form: test drive / callback / dealer contact, persisted to SQLite.
- **Compare cart** — add up to 3 cars from any card; `/compare` renders a side-by-side spec table. State in `localStorage`, synced via a custom window event.
- **Persona flexibility** — each persona declares which preferences are negotiable; the matcher halves their weight (`FLEX_SCALE = 0.5`) so flexible mismatches hurt half as much.
- **Live tweak panel** — collapsible panel on the persona shortlist lets the user override budget / seats / transmission / fuels / safety floor; URL `searchParams` are the canonical source and the server re-ranks on the next render.

See [`docs/FEATURES.md`](./docs/FEATURES.md) for the full mock-vs-real breakdown.

---

## Quick start

Requires **Node 20+**.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The SQLite DB at `data/app.db` auto-seeds on the first request that touches `lib/repo.ts`. To reset, delete `data/app.db` and reload.

| Script           | Purpose                |
| ---------------- | ---------------------- |
| `npm run dev`    | Next dev server        |
| `npm run build`  | Production build       |
| `npm run start`  | Run built app          |
| `npm run lint`   | ESLint (next config)   |

---

## Deploy

Vercel auto-deploys on push to `main`. No env vars required for the MVP.

> **Caveat:** SQLite is at `/tmp/app.db` on Vercel and is **ephemeral across cold starts**. Lead and view rows survive only on a warm instance. For production, swap the persistence layer to **Turso (libSQL)** or **Vercel Postgres** — the swap is local to `lib/db.ts`. See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#how-to-swap-better-sqlite3-for-turso) for steps.

`next.config.mjs` already sets `experimental.serverComponentsExternalPackages: ['better-sqlite3']` so the native module isn't bundled.

---

## Architecture (high level)

```
┌──────────┐   HTTP    ┌────────────────────────┐   call    ┌──────────┐   SQL    ┌────────┐
│ Browser  │ ────────▶ │ Next.js App Router     │ ────────▶ │ lib/repo │ ───────▶ │ SQLite │
│ (RSC)    │ ◀──────── │ Server Components +    │ ◀──────── │   .ts    │ ◀─────── │ app.db │
└──────────┘   HTML    │ /api/* route handlers  │  Persona/ └──────────┘  rows    └────────┘
                       └────────────────────────┘  Car/Lead       │
                                                                   ▼
                                                            seed.ts hydrates from
                                                            data/personas.json
                                                            data/cars.json
```

| Layer            | Module                          | Responsibility                                |
| ---------------- | ------------------------------- | --------------------------------------------- |
| Pages / RSC      | `app/page.tsx`, `app/personas/[id]`, `app/cars/[id]` | Server render UI         |
| Compare page     | `app/compare/page.tsx`          | Client-side side-by-side comparison           |
| API              | `app/api/personas`, `match`, `cars`, `views`, `leads` | JSON over HTTP           |
| Matcher          | `lib/matcher.ts`                | Persona → ranked `MatchResult[]` (honors `flexibility`) |
| Data access      | `lib/repo.ts`                   | Single chokepoint over the DB                 |
| DB / schema      | `lib/db.ts` + `lib/seed.ts`     | better-sqlite3, seed from JSON on first hit   |
| Type contract    | `lib/types.ts`                  | Source of truth for every entity              |
| Static catalog   | `data/personas.json`, `data/cars.json` | Hand-authored seed data (12 personas)  |
| Compare store    | `lib/compare-store.ts`          | localStorage wrapper + custom event           |
| Mock LLM         | `lib/llm.ts`                    | Deterministic stub (V2 placeholder)           |

---

## Project layout

```
.
├── app/                  Next.js App Router (RSC + /api)
│   ├── page.tsx          Persona picker (home)
│   ├── personas/[id]/    Shortlist page (reads searchParams for tweaks)
│   ├── cars/[id]/        Car detail + media + lead form
│   ├── compare/          Side-by-side compare ('use client')
│   └── api/              Route handlers
├── components/           UI primitives (CarCard, WhyThisCar, MediaEmbed, LeadForm,
│                          CompareButton, CompareCart, PersonaTweakPanel, …)
├── data/                 Static seed JSON (12 personas, ~30 cars) + app.db (gitignored)
├── lib/                  Server-only domain code (+ one client store)
│   ├── types.ts          The contract (incl. Persona.flexibility)
│   ├── db.ts             SQLite connection + schema
│   ├── seed.ts           JSON → SQLite hydration
│   ├── repo.ts           Read/write API for the rest of the app
│   ├── matcher.ts        Weighted persona-to-car scoring (FLEX_SCALE-aware)
│   ├── llm.ts            Mocked LLM (V2 placeholder)
│   └── compare-store.ts  localStorage wrapper for the compare cart (client-only)
├── docs/                 FEATURES.md, ARCHITECTURE.md
├── CLAUDE.md             Guide for Claude Code sessions
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## Where to look

| You want to…                                    | Read                                  |
| ----------------------------------------------- | ------------------------------------- |
| Understand each shipped feature, mock vs real   | [`docs/FEATURES.md`](./docs/FEATURES.md) |
| See data flow, DB schema, API contract          | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Hack on the codebase as Claude / a contributor  | [`CLAUDE.md`](./CLAUDE.md)            |
| Trust the type shapes                           | [`lib/types.ts`](./lib/types.ts)      |

---

## Tech decisions

- **Next.js 14 App Router + RSC.** Server components by default. Matcher and DB stay server-side; the wire payload is HTML, not JSON. Client components are reserved for the lead form and any interactive bits.
- **better-sqlite3 for the MVP.** Zero-ops, file-backed, synchronous API that pairs cleanly with RSC. The `lib/repo.ts` chokepoint means swapping to Turso/Postgres is a one-file change. We accepted Vercel's `/tmp` ephemerality because the MVP is a demo, not a production lead pipeline.
- **No shadcn, no headless UI, no client state lib.** Tailwind utilities only. Six components carry the whole UI; adding a primitive library would be more weight than the app needs.
- **zod everywhere at the API edge.** Thin validation; same schemas could power a typed client later.
- **Mocked LLM, real interface.** `lib/llm.ts` defines the V2 conversational-intake contract today so the swap to an Anthropic SDK call is a body-only change.

---

## What's mocked

Every layer that would touch a third-party system in production is stubbed. See [`docs/FEATURES.md`](./docs/FEATURES.md) for the full mock-vs-real ledger.
