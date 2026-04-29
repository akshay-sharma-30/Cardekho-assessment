# CarFit — Architecture

## Stack

| Concern         | Choice                                              |
| --------------- | --------------------------------------------------- |
| Framework       | Next.js 14.2 (App Router) + TypeScript strict       |
| Styling         | Tailwind CSS 3.4 (no shadcn / no headless UI)       |
| DB              | better-sqlite3 11.x (file DB; `/tmp` on Vercel)     |
| Validation      | zod 3.x at every API edge                           |
| Runtime         | Node 20+                                            |
| Deps            | Minimal — see `package.json`. No client state lib.  |

---

## Data flow

### (a) Persona pick → match → render

```
Browser                Next.js (RSC)              lib/                   SQLite
   │  GET /personas/p1     │                        │                       │
   ├──────────────────────▶│                        │                       │
   │                       │  repo.persona('p1')    │                       │
   │                       ├───────────────────────▶│  SELECT * FROM        │
   │                       │                        ├──────────────────────▶│
   │                       │                        │◀──────────────────────┤
   │                       │  repo.allCars()        │                       │
   │                       ├───────────────────────▶├──────────────────────▶│
   │                       │                        │◀──────────────────────┤
   │                       │  matcher.matchPersona( │                       │
   │                       │    persona, cars)      │                       │
   │                       │  → MatchResult[] (top3)│                       │
   │                       │  repo.popularInPersona │                       │
   │                       ├───────────────────────▶├──────────────────────▶│
   │                       │                        │◀──────────────────────┤
   │  HTML (RSC payload)   │                        │                       │
   │◀──────────────────────┤                        │                       │
```

The wire payload is HTML, not JSON — the matcher runs server-side and the buyer gets a fully rendered shortlist on first byte.

### (b) Car detail view → recordView

```
Browser                /api/cars/[id]?persona=p1            repo                SQLite
   │  GET                       │                            │                    │
   ├───────────────────────────▶│                            │                    │
   │                            │  repo.car(id)              │                    │
   │                            ├───────────────────────────▶│  SELECT cars       │
   │                            │                            ├───────────────────▶│
   │                            │  repo.recordView({         │                    │
   │                            │    carId, personaId })     │                    │
   │                            ├───────────────────────────▶│  INSERT views      │
   │                            │                            ├───────────────────▶│
   │                            │  repo.totalViews(id)       │                    │
   │                            │  repo.totalLeads(id)       │                    │
   │                            ├───────────────────────────▶├───────────────────▶│
   │  { car, totalViews,        │                            │                    │
   │    totalLeads }            │                            │                    │
   │◀───────────────────────────┤                            │                    │
```

### (c) Lead submit → /api/leads → repo.createLead

```
LeadForm ('use client')      /api/leads (POST)          zod          repo            SQLite
   │  POST {carId, intent,     │                          │            │                │
   │    name, phone, city,     │                          │            │                │
   │    personaId?}            │                          │            │                │
   ├──────────────────────────▶│  parse body              │            │                │
   │                           ├─────────────────────────▶│            │                │
   │                           │  ok / ZodError           │            │                │
   │                           │◀─────────────────────────┤            │                │
   │                           │  repo.createLead(lead)   │            │                │
   │                           ├─────────────────────────────────────▶│  INSERT leads   │
   │                           │                                       ├────────────────▶│
   │                           │                                       │◀────────────────┤
   │  { id, ok: true }         │                                       │                 │
   │◀──────────────────────────┤                                       │                 │
   │  // or 400 + zod errors                                           │                 │
```

---

## DB schema

Source: `lib/db.ts:32-82`. SQLite, WAL mode, foreign keys on.

```sql
-- Personas: full preference blob stored as JSON in `data` so the schema
-- doesn't have to chase every nested preference field.
CREATE TABLE IF NOT EXISTS personas (
  id          TEXT PRIMARY KEY,        -- slug, e.g. "young-family-metro"
  title       TEXT NOT NULL,           -- "New parent in the metro"
  tagline     TEXT NOT NULL,           -- one-line card copy
  emoji       TEXT NOT NULL,           -- visual marker on tile
  description TEXT NOT NULL,           -- 1-2 sentence detail
  data        TEXT NOT NULL            -- JSON: { preferences, highlights }
);

-- Cars: top-level filterable columns are first-class; nested pros/cons + media
-- live in JSON for the same pragmatic reason.
CREATE TABLE IF NOT EXISTS cars (
  id            TEXT PRIMARY KEY,      -- slug, e.g. "maruti-swift-vxi"
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  variant       TEXT NOT NULL,
  body          TEXT NOT NULL,         -- BodyStyle enum
  fuel          TEXT NOT NULL,         -- FuelType enum
  transmission  TEXT NOT NULL,         -- Transmission enum
  seats         INTEGER NOT NULL,
  price_lakh    REAL NOT NULL,         -- ex-showroom INR lakh
  fe_kmpl       REAL NOT NULL,         -- fuel efficiency
  safety        REAL NOT NULL,         -- 1..5 stars
  boot_l        INTEGER NOT NULL,      -- boot litres
  length_mm     INTEGER NOT NULL,      -- vehicle length (parking-friendly check)
  ground_mm     INTEGER NOT NULL,      -- ground clearance
  image_url     TEXT NOT NULL,
  one_liner     TEXT NOT NULL,         -- editorial sales line
  data          TEXT NOT NULL          -- JSON: { prosCons, media[] }
);

-- Leads: anonymous submissions from car detail pages.
CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id      TEXT NOT NULL,           -- FK in spirit; not enforced
  persona_id  TEXT,                    -- nullable: lead may bypass persona flow
  intent      TEXT NOT NULL,           -- 'test_drive' | 'callback' | 'dealer_contact'
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  city        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- View events: one row per detail-page render. Aggregated for social proof.
CREATE TABLE IF NOT EXISTS views (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  car_id      TEXT NOT NULL,
  persona_id  TEXT,                    -- nullable: not every view originates from a persona
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS views_car_persona_idx ON views(car_id, persona_id);
CREATE INDEX IF NOT EXISTS leads_car_idx ON leads(car_id);
```

**Why JSON columns?** The shape of `Persona.preferences` and `Car.media` is wide and changes more often than the matcher cares about. Storing them as JSON keeps the schema thin without sacrificing typing — `lib/seed.ts` (`rowToPersona`, `rowToCar`) hydrates them back into typed objects so the rest of the app is unaware they were ever blobs.

---

## API routes

All routes live under `app/api/*/route.ts`. All input is validated with **zod** before hitting `lib/repo.ts`.

| Method | Path                             | Request shape                                                                                   | Response shape                                                                                   | Validation                                                              |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| GET    | `/api/personas`                  | —                                                                                               | `{ personas: Persona[] }`                                                                        | None (read-only).                                                       |
| POST   | `/api/match`                     | `{ personaId: string }`                                                                         | `MatchResponse { persona, matches[], totalCandidates, popularInPersona[] }`                      | `personaId` non-empty string. 404 if persona missing.                   |
| GET    | `/api/cars/[id]?persona=<id>`    | URL: `id` (path), `persona` (optional query)                                                    | `{ car: Car, totalViews: number, totalLeads: number }`. **Side effect:** records a view.         | `id` non-empty. 404 if car missing.                                     |
| POST   | `/api/views`                     | `{ carId: string, personaId?: string }`                                                         | `{ ok: true }`                                                                                   | `carId` required, `personaId` optional.                                 |
| POST   | `/api/leads`                     | `{ carId, personaId?, intent: 'test_drive'\|'callback'\|'dealer_contact', name, phone, city? }` | `{ id: number, ok: true }` on success, or `400` with `{ errors: ZodIssue[] }` on bad input.      | All fields zod-checked; phone shape, intent enum, name length.          |

`MatchResponse` is the single richest payload — see `lib/types.ts:105`. It carries the persona, the ranked `MatchResult[]` (each with `score`, `fitTier`, and per-criterion `MatchReason[]`), the total candidate pool size, and the top 3 popular cars for that persona.

---

## Type contract overview

The single source of truth is **[`lib/types.ts`](../lib/types.ts)**. Every layer — JSON seed, DB hydrators, matcher, API routes, components — agrees on these shapes.

| Type            | Purpose                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| `Persona`       | A lifestyle bundle of preferences. Drives the matcher.                        |
| `Car`           | A single car/variant with curated media.                                      |
| `MediaLink`     | One YouTube embed or article link with `vetted` flag.                         |
| `MatchReason`   | One row of the "why this car" breakdown — `criterion`, `passed`, `weight`.    |
| `MatchResult`   | A car + score (0..100) + reasons + `fitTier`.                                 |
| `MatchResponse` | Full API payload: persona + ranked matches + popularity stats.                |
| `Lead`          | Anonymous form submission (test drive / callback / dealer contact).           |
| `ViewEvent`     | One row per car detail-page render, keyed on (car, persona).                  |

Rule of thumb: **if you change one of these shapes, audit every layer.** That's the point of the contract.

---

## How to add a new persona

1. Edit `data/personas.json`, add an entry that satisfies the `Persona` type (`lib/types.ts:10`).
2. Delete the local DB so the seeder re-runs:
   ```bash
   rm data/app.db
   ```
3. `npm run dev` — the next request that hits `lib/repo.ts` will lazy-seed `data/personas.json` into the `personas` table (`lib/db.ts:87-95`).
4. Verify on `/` that the new tile shows up; click through to `/personas/<new-id>` and confirm the matcher returns sensible cars.

---

## How to add a new car

1. Edit `data/cars.json`, add an entry that satisfies the `Car` type (`lib/types.ts:44`). Include at least 2 entries in `media[]` to keep the detail page useful.
2. Delete `data/app.db` and restart `npm run dev`.
3. Validate by visiting `/cars/<new-id>` and confirming media renders + the form submits.
4. If you tweak existing fields (e.g. `priceLakh`), the matcher's hard-fail thresholds (>25% over budget, seats < required) may flip the car's eligibility for some personas — re-check the persona shortlists.

---

## How to swap better-sqlite3 for Turso

Turso (libSQL) is SQLite-compatible, so the swap is contained to `lib/db.ts`. Repo and API layers are unchanged.

1. Install:
   ```bash
   npm install @libsql/client
   npm uninstall better-sqlite3 @types/better-sqlite3
   ```
2. Set env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
3. Rewrite `lib/db.ts` to return a libSQL client wrapped to expose the same `prepare(...).all() / .get() / .run()` shape, **or** update `lib/repo.ts` to use `client.execute({ sql, args })`. Either approach works; the wrapper option keeps `repo.ts` untouched.
4. Move the `CREATE TABLE` statements into a one-shot migration script (`lib/migrate.ts`) — libSQL is remote, so seeding-on-first-request is wasteful. Run migrations on deploy.
5. Drop `serverComponentsExternalPackages: ['better-sqlite3']` from `next.config.mjs` once the native module is gone.
6. Update `lib/seed.ts` to handle remote inserts (batched transaction via `client.batch([...])`).

The same recipe with `pg` and Vercel Postgres is equivalent — the only differences are the placeholder syntax (`$1` vs `?`) and connection pool setup.

---

## Vercel deployment notes

- **Env vars (MVP):** none required.
- **DB location on Vercel:** `/tmp/app.db`, set in `lib/db.ts:18-20` based on `process.env.VERCEL`. Per-instance and **ephemeral across cold starts** — leads written on a warm instance survive until that instance is recycled, then they're gone.
- **Seeding on Vercel:** the lazy seeder in `lib/db.ts:87-95` runs on the first request to a cold instance, re-inserting the static catalog. Catalog reads are fine; user-written data (leads, views) is the casualty.
- **Native module:** `next.config.mjs` sets `experimental.serverComponentsExternalPackages: ['better-sqlite3']` so Next doesn't try to bundle the native binary into the RSC graph. Required.
- **Image domains:** `next.config.mjs` whitelists `i.ytimg.com`, `img.youtube.com`, `imgd.aeplcdn.com`, `images.unsplash.com`. Add new image hosts here.
- **Production fix:** swap to Turso/Postgres before any real lead capture. Until then, treat the deploy as a demo.
