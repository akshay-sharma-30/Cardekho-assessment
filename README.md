# CarFit

**Needs-first car discovery for clueless Indian buyers.**

CarFit helps clueless car buyers in India choose a car. Pick a persona ("New parent in metro", "Highway commuter", etc.), see a curated 3-car shortlist matched to your needs, and on each car detail page watch curated YouTube reviews and read articles from trusted media houses — all in one place. The thesis is conversion-through-trust: surfacing real reviewer opinions in-app cuts the bounce-to-Google that kills aggregator conversion.

---

## 30-second demo flow

1. Land on `/` → pick one of 6 lifestyle personas.
2. `/personas/[id]` → see a transparent 3-car shortlist with per-criterion match breakdown.
3. `/cars/[id]` → watch 2-3 embedded reviews, read articles from PowerDrift / Autocar / CarWale.
4. Submit a test-drive / callback request without leaving the page.

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
| API              | `app/api/personas`, `match`, `cars`, `views`, `leads` | JSON over HTTP           |
| Matcher          | `lib/matcher.ts`                | Persona → ranked `MatchResult[]`              |
| Data access      | `lib/repo.ts`                   | Single chokepoint over the DB                 |
| DB / schema      | `lib/db.ts` + `lib/seed.ts`     | better-sqlite3, seed from JSON on first hit   |
| Type contract    | `lib/types.ts`                  | Source of truth for every entity              |
| Static catalog   | `data/personas.json`, `data/cars.json` | Hand-authored seed data                |
| Mock LLM         | `lib/llm.ts`                    | Deterministic stub (V2 placeholder)           |

---

## Project layout

```
.
├── app/                  Next.js App Router (RSC + /api)
│   ├── page.tsx          Persona picker (home)
│   ├── personas/[id]/    Shortlist page
│   ├── cars/[id]/        Car detail + media + lead form
│   └── api/              Route handlers
├── components/           UI primitives (CarCard, WhyThisCar, MediaEmbed, LeadForm, …)
├── data/                 Static seed JSON (personas, cars) + app.db (gitignored)
├── lib/                  Server-only domain code
│   ├── types.ts          The contract
│   ├── db.ts             SQLite connection + schema
│   ├── seed.ts           JSON → SQLite hydration
│   ├── repo.ts           Read/write API for the rest of the app
│   ├── matcher.ts        Weighted persona-to-car scoring
│   └── llm.ts            Mocked LLM (V2 placeholder)
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
