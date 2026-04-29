# CarFit — Feature Spec

Each feature below is broken into **What it does**, **How it works**, **What's mocked**, and **Production version**. The mock-vs-real framing is the most important part of this doc — the MVP is a credible demo, not a production system.

---

## 1. Persona-based discovery

| Layer            | MVP (mock)                                       | Production                                        |
| ---------------- | ------------------------------------------------ | ------------------------------------------------- |
| Persona catalog  | 12 hand-authored entries in `data/personas.json` | CMS-managed, A/B tested copy, localized           |
| Personalisation  | None                                             | Returning-visitor persona memory (cookie + auth)  |

### What it does
The home page shows 12 lifestyle tiles ("New parent in the metro", "Highway commuter", "EV-curious metro buyer", "Seven-seater multigen", etc.) instead of the usual 30-filter form. One click takes the buyer to a curated 3-car shortlist. Lower friction, higher commitment per click.

### How it works
- Personas are defined in `data/personas.json` against the `Persona` type (`lib/types.ts:10`), including a per-persona `flexibility` array of negotiable preference fields the matcher honors (see Feature 8).
- On first DB hit, `lib/seed.ts` writes them into the `personas` table (`lib/db.ts:33`); the full preference blob is stored as JSON in the `data` column.
- `app/page.tsx` is a server component that calls `repo.allPersonas()` (`lib/repo.ts:8`) and renders `components/PersonaCard.tsx`.
- Clicking a tile navigates to `/personas/[id]`.

### What's mocked
- 12 hand-authored static entries (the original 6 + `ev-curious-metro`, `seven-seater-multigen`, `fleet-cabbie`, `compact-second-car`, `enthusiast-driver`, `retired-comfort`). No persona evolution, no learning, no localization.
- Preference fields are coarse (e.g. `boot: 'small' | 'medium' | 'large'`) — designed for clarity, not nuance.
- `flexibility` lists are hand-authored; no learning loop yet (see Feature 8).
- No tracking of which personas convert best.

### Production version
- Move persona copy/preferences into a CMS so non-engineers can iterate.
- Track CTR and downstream lead-rate per persona; retire underperformers.
- Cookie/auth-back the last selected persona for return visits; pre-rank tiles by predicted relevance.
- Add 10–20 long-tail personas behind a "more" expander once we have signal.

---

## 2. Persona-to-car matcher

| Layer       | MVP (mock)                                       | Production                                          |
| ----------- | ------------------------------------------------ | --------------------------------------------------- |
| Algorithm   | Deterministic weighted scoring (100 pts)         | Same v1; learned ranker v2 trained on user signals  |
| Inventory   | ~30 hand-authored cars from `data/cars.json`     | Daily ingest from dealer API into Postgres          |
| Output      | `MatchResult[]` with per-criterion `MatchReason` | Same shape; reasons enriched with confidence        |

### What it does
Server-side scores every car against the chosen persona's preferences and returns the top 3 with `fitTier` labels (`excellent` / `strong` / `good` / `stretch`) and a transparent breakdown of why each scored what it did.

### How it works
- `lib/matcher.ts` exports `matchPersona(persona, cars): MatchResult[]`.
- `POST /api/match` accepts `{ personaId, limit? }` (limit default 24, max 100). The matcher always scores the full catalog server-side and sorts; the response slices `matches` to `limit` and returns a `meta: ListMeta` envelope (`{ limit, total, hasMore }`) so callers can paginate later without reshaping the payload.
- **Hard fails** (drop the car):
  - Price exceeds `budgetMaxLakh` by more than 25%.
  - Seats < `preferences.seats`.
- **Soft scoring** (sums to 100):

  | Criterion       | Weight |
  | --------------- | -----: |
  | Budget fit      |     25 |
  | Seats           |     15 |
  | Safety          |     15 |
  | Fuel efficiency |     10 |
  | Fuel type       |     10 |
  | Transmission    |     10 |
  | Boot size       |      5 |
  | Parking-friendly|      5 |
  | Highway suited  |      5 |

- For each criterion the matcher emits a `MatchReason { criterion, passed, detail, weight }` (`lib/types.ts:69`) so the UI can render a green/red breakdown.
- `fitTier` is derived from total score (rough bands: ≥85 excellent, ≥70 strong, ≥55 good, else stretch).
- Called from `POST /api/match` and from the `/personas/[id]` server component.

### What's mocked
- Weights are hand-tuned, not learned.
- No personalization beyond the chosen persona — every "young-family-metro" buyer sees the same shortlist.
- Cars are the static ~30-row catalog with realistic-but-static prices/specs. No real-time inventory, no dealer-level price variation, no on-road price.
- No diversity rule: if 3 trims of the same model dominate, all 3 may show.

### Production version
- Ship the weighted version as **v1**.
- Instrument three signals per (persona, car) pair: **impression**, **detail-page click**, **lead-form submit**.
- Train a learned ranker (gradient-boosted trees over the same features + signal counts) as **v2**. Same `MatchResult` output shape — UI is unchanged.
- Add a diversity penalty (de-rank within the same model) and freshness boost.
- Cars come from a daily ingest job: dealer API (CarDekho/CarWale syndication) or a scraped + cleaned snapshot, written into Postgres. Specs cached, prices refreshed nightly.

---

## 3. Why-this-car transparency

| Layer        | MVP (mock)                                          | Production                                       |
| ------------ | --------------------------------------------------- | ------------------------------------------------ |
| Data source  | `MatchResult.reasons[]` from the weighted matcher   | Same, plus learned-model feature importances     |
| UI           | Static checks, copy from the matcher                | Tooltip with confidence + counter-evidence       |

### What it does
On the persona shortlist and car detail page, every recommendation surfaces **green and red checks per criterion** ("✓ under ₹9L budget", "✗ 4-star safety, you wanted 5"). Counters CarDekho-style opaque "Top picks".

### How it works
- `components/WhyThisCar.tsx` consumes the `reasons: MatchReason[]` field of a `MatchResult` and renders a checked/crossed list grouped by `criterion`.
- `components/MatchScoreBadge.tsx` (`components/MatchScoreBadge.tsx:1`) shows the numeric score and `fitTier`.
- No client-side computation — everything is precomputed by `lib/matcher.ts` server-side.

### What's mocked
- Reason text is templated from criterion + threshold. No NLG, no per-buyer phrasing.
- No counter-evidence ("here's why some buyers dislike this") — only the matcher's verdict.

### Production version
- Pull feature importances from the learned ranker and surface the top 3 reasons by impact, not by fixed order.
- Add a small "what reviewers say" callout pulled from the YouTube transcript sentiment (see Feature 4 production version).
- Click-through on a red check should explain trade-offs and propose alternatives.

---

## 4. Curated media at the decision point

| Layer            | MVP (mock)                                                | Production                                            |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| YouTube embeds   | Synthetic 11-char IDs in `data/cars.json`; not guaranteed to resolve | YouTube Data API v3, whitelisted channels, daily cache |
| Article links    | Valid-looking domain paths; not verified to render        | RSS ingest from media partners                        |
| Vetting          | `vetted: boolean` flag set by hand                        | Editorial dashboard + sentiment auto-flag             |

### What it does
Each car detail page embeds 2-3 curated YouTube reviews and links to articles from trusted Indian media (PowerDrift, Autocar India, CarWale, MotorOctane). The buyer doesn't tab out to Google — that's the whole conversion thesis.

### How it works
- Each `Car.media: MediaLink[]` (`lib/types.ts:34`) holds `{ type, title, source, url, youtubeId?, vetted }`.
- `components/MediaEmbed.tsx` renders YouTube iframes (`https://www.youtube.com/embed/${youtubeId}`) and external article cards.
- `next.config.mjs` whitelists `i.ytimg.com` and `img.youtube.com` for thumbnails.
- Source attributions (channel names) are real; the specific video IDs in the seed data are placeholders.

### What's mocked
- **YouTube IDs are synthetic 11-char strings**, not guaranteed to resolve to real videos.
- Source channel names are real (PowerDrift, Autocar India, CarWale, MotorOctane); the IDs aren't tied to real uploads from those channels.
- Article URLs follow plausible paths on the right domains but are not verified to render a 200.
- `vetted` is a hand flag with no audit trail.

### Production version
- **YouTube ingest:** YouTube Data API v3, query `${brand} ${model} review`, filter to a whitelist of channel IDs (PowerDrift, Autocar India, CarWale, MotorOctane, AutoTrend, etc.). Cache daily. Store `videoId`, `publishedAt`, `viewCount`, `likeCount`, channel ID.
- **Article ingest:** RSS feeds from media partners, deduped by canonical URL. Optionally a syndication deal with one partner for first-look pieces.
- **Sentiment auto-flag:** run a sentiment classifier over the YouTube transcript (`youtube-transcript-api` + a sentence-level classifier). Auto-mute videos below threshold; flag for editorial review.
- **Editorial dashboard:** small admin UI to whitelist/blacklist videos, override sentiment, and pin a "must-watch" review per car.
- Track per-video play-rate and downstream lead-rate; promote videos that convert.

---

## 5. Lead capture

| Layer        | MVP (mock)                                | Production                                         |
| ------------ | ----------------------------------------- | -------------------------------------------------- |
| Storage      | SQLite `leads` table (ephemeral on Vercel)| Turso/Postgres, durable                            |
| Verification | None (anonymous)                          | Phone OTP                                          |
| Routing      | None                                      | Webhook → Salesforce / Zoho with SLA timer         |

### What it does
Each car detail page has a single form: **Test drive / Callback / Dealer contact**. Buyer enters name + phone (+ optional city), submits, and gets a confirmation. Persists to SQLite.

### How it works
- `components/LeadForm.tsx` (`'use client'`) posts to `/api/leads`.
- `app/api/leads/route.ts` validates with zod and calls `repo.createLead(lead: Lead)` (`lib/repo.ts:63`).
- Schema: `leads(id, car_id, persona_id, intent, name, phone, city, created_at)` (`lib/db.ts:62`).
- `intent ∈ {test_drive, callback, dealer_contact}` per the `Lead` type (`lib/types.ts:86`).
- `personaId` is `.nullish()` in the zod body — clients can send `null` or omit the field entirely. This is the **anonymous lead path** for buyers who land directly on `/cars/[id]` (e.g. from a shared link or `/compare`) without ever picking a persona; they no longer 400.

### What's mocked
- No phone verification — any string passes basic shape validation.
- On Vercel, leads land in `/tmp/app.db` and **disappear on cold start**. Locally they persist in `data/app.db`.
- No dealer CRM integration. No SMS/email confirmation to the buyer. No internal notification.
- No anti-fraud (rate limit, captcha, honeypot).

### Production version
- Phone OTP before submit (Twilio / MSG91). Slashes fraud and unlocks return-visitor persona memory.
- Persistence in Turso or Vercel Postgres via the `lib/repo.ts` swap; the rest of the app is unchanged.
- Outbound webhook on lead create → Salesforce / Zoho. Track an SLA-backed callback timer and surface it to the buyer ("a dealer will call you in <30 min").
- Buyer-facing confirmation: SMS + email with the dealer name and a calendar invite for the test drive.
- Server-side rate limit (Upstash Redis) keyed on phone + IP.

---

## 6. View aggregation (social proof)

| Layer       | MVP (mock)                                          | Production                                      |
| ----------- | --------------------------------------------------- | ----------------------------------------------- |
| Counter     | SQLite `views` table, per (car, persona)            | Postgres + materialized view; bot-filtered      |
| Surfacing   | `popularInPersona(personaId)` on shortlist page     | Same, plus "trending this week"                 |

### What it does
Every car detail page records a view event tagged with the persona context. The shortlist page uses these counts to surface "Popular with other [persona] buyers" — social proof at the moment of decision.

### How it works
- View recording happens **client-side** on the car detail page via `components/RecordView.tsx`. The component mounts inside `app/cars/[id]/page.tsx`, fires one `POST /api/views` on mount (guarded by a `useRef` flag so StrictMode's double-invoke doesn't double-count), and silently swallows failures so analytics never breaks the UI.
- `POST /api/views` is the **sole** writer to the `views` table; `GET /api/cars/[id]` is a pure read.
- This split exists because folding the write into `GET /api/cars/[id]` inflated the counter: RSC `<Link>` prefetches and the `/compare` fan-out (one fetch per car in the cart) both hit that endpoint without representing real human views. Same problem with CDN warmups and health checks. Moving recording client-side means only an actual mount in a real browser counts.
- `repo.popularInPersona(personaId, limit=3)` (`lib/repo.ts:31`) groups views by `car_id` for a persona and returns the top N.
- Indexed by `views_car_persona_idx` (`lib/db.ts:80`).

### What's mocked
- No bot filtering — every request increments the counter.
- On Vercel, counts live in `/tmp` and reset on cold start.
- No de-dup: a single user reloading 100 times counts as 100 views.
- No time decay — a car popular six months ago looks as popular as one trending today.

### Production version
- Move to Postgres with a materialized view refreshed every minute.
- Bot filter: drop UAs without JS exec (RSC fetch detection), drop above-threshold per-IP rates, integrate Cloudflare Bot Management.
- Sessionize via cookie; one view per (session, car) per day.
- Add time decay (e.g. exponential, half-life 7 days) so "trending" reflects this week's reality.
- Pipe events to BigQuery / PostHog for downstream analytics; the SQLite counter is for live UI only.

---

## 7. Compare cart

| Layer        | MVP (mock)                                                | Production                                              |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| Storage      | `localStorage` under `carfit:compare`, capped at 3 ids    | Server-side cart keyed on phone-OTP'd user / anon cookie |
| Sync         | Custom `'compare:change'` window event + `storage` event  | `/api/compare/sessions` for cross-device sync           |
| Page         | `/compare` client component, fetches via `/api/cars/[id]` | Same UI; reads server cart on first render             |

### What it does
User can add up to 3 cars to a compare cart from car cards or the detail page; `/compare` renders a side-by-side spec table + first-review-per-car. Header pill shows live count.

### How it works
- Selection state in `localStorage` under key `carfit:compare` (`lib/compare-store.ts:13`), capped at 3 (`MAX_ITEMS`), deduped on every write.
- Cross-component sync via a custom `'compare:change'` window event broadcast on every write (`lib/compare-store.ts:52`); `subscribe()` also listens for the cross-tab `storage` event.
- `app/compare/page.tsx` is a client component that reads `localStorage` on mount and fetches each car via `/api/cars/[id]`. `components/CompareCart.tsx` in the header subscribes to the same event for live count updates.
- `components/CompareButton.tsx` lives on car cards and the detail page; it gates render with a `mounted` flag to avoid hydration drift, and uses `e.stopPropagation()` so clicking it inside a parent `<Link>` doesn't navigate.

### What's mocked
- Cart state is purely client-side; not bound to a user account, not synced across devices.
- No analytics on compare-completion as a conversion signal.

### Production version
- Move to a server-side cart keyed by phone-OTP'd user (or an anonymous cart cookie); persist to Postgres; expose `/api/compare/sessions` for cross-device sync.
- Add "share this comparison" via signed URL.
- Instrument compare-completion as a high-intent conversion signal feeding back into ranker training (Feature 2 production version).

---

## 8. Flexibility field on personas

| Layer        | MVP (mock)                                                  | Production                                                 |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Source       | Hand-authored `flexibility[]` per persona in JSON           | Learned per-user from impression / click / lead / dismiss  |
| Matcher      | `FLEX_SCALE = 0.5` halves weight + scales contribution      | Same hook; weights learned, not hand-tuned                 |
| UI           | Reason rows tagged ` · flexible`                            | Same                                                       |

### What it does
Each persona declares which of its preferences are negotiable. The matcher halves the weight of those criteria — mismatching them hurts the score less. UX result: more cars surface above the "stretch" line for personas that have flexibility, which mirrors how real buyers actually shop ("I'd rather get a great car than tick every box").

### How it works
- `Persona.flexibility?: Array<keyof preferences>` in `lib/types.ts:37`.
- `lib/matcher.ts` uses a `CRITERION_TO_PREF` map (`lib/matcher.ts:44`) and a `FLEX_SCALE = 0.5` constant (`lib/matcher.ts:40`); if a criterion's underlying pref is in `persona.flexibility`, both the contribution and the displayed `MatchReason.weight` are scaled.
- Reason text is appended with ` · flexible` so the UI can show why the row is downweighted.
- Hard-fail rules (budget +25%, seats < required) are unchanged — flexibility never overrides them.

### What's mocked
- Flexibility lists are hand-authored per persona. No learning loop yet.

### Production version
- Learn flexibility per real user from their (impression, click, lead, dismiss) signals — e.g., a user who keeps clicking through 6-seater results despite a 5-seat persona is flagging `seats` as flexible.
- Store learned flexibility per session/account and merge with the persona default at match time.
- Surface "we noticed you're flexible on X" copy when a learned flex bucket has high confidence.

---

## 9. Persona tweak panel (live re-rank)

| Layer        | MVP (mock)                                                | Production                                              |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| Persistence  | URL `searchParams` only                                   | Saved to user account; can save as a new "my persona"   |
| Defaults     | Static per persona                                        | A/B tested per geography (Tier 1 vs Tier 2/3)           |
| Signal use   | None                                                      | Each tweak feeds learned ranking + learned flexibility  |

### What it does
A collapsible panel on the persona shortlist page lets the user override budget cap, seats, transmission, allowed fuels, and safety floor. Adjusting any control re-ranks the list immediately.

### How it works
- `components/PersonaTweakPanel.tsx` is a client component; it reads current values from `useSearchParams()` and writes new values via `router.replace('?...', { scroll: false })`.
- `app/personas/[id]/page.tsx` is a server component that parses `searchParams`, validates, and merges overrides over `persona.preferences` to produce a `tweakedPersona` passed to the matcher.
- URL keys: `budget`, `seats`, `trans`, `fuel` (comma-separated), `safety`. Validation on the server side: `budget` clamped to [4, 40], `seats` ∈ {4, 5, 7}, `trans` ∈ {manual, automatic}, `fuel` filtered to valid `FuelType` values, `safety` ∈ {3, 4, 5}.
- `PrefChips` reflect the live tweaked values; a small "Tweaked" pill shows when overrides are active.

### What's mocked
- Overrides are URL-only; not persisted across sessions.
- No telemetry on which tweaks correlate with conversion.

### Production version
- Persist tweaks to the user's account; treat each tweak as a strong signal for learned ranking and learned flexibility (see Feature 8).
- Allow saving a tweaked persona as a new "my persona".
- A/B test default control values per geography (Tier 1 vs Tier 2/3 buyers want different defaults).

---

## 10. Mocked LLM hook (V2 placeholder)

| Layer       | MVP (mock)                                                  | Production                                   |
| ----------- | ----------------------------------------------------------- | -------------------------------------------- |
| Provider    | Deterministic keyword matcher in `lib/llm.ts`               | Anthropic SDK (Claude Haiku / Sonnet)        |
| Output      | `Persona['preferences']`-shaped object                      | Same, via structured output schema           |
| Wired in UI | No                                                          | Yes — replaces persona picker for power users|

### What it does
Defines the interface for a future conversational intake: "I have ₹10L, two kids, drive to Pune every weekend" → structured `Persona['preferences']`. Today it's a stub so the rest of the app can be designed against the real interface.

### How it works
- `lib/llm.ts` exports a `LLMProvider` interface and a `mockLLM` implementation.
- The mock matches keywords ("family", "highway", "city", "first car", numbers like "10L") and emits a `Persona['preferences']` blob.
- **Not wired into the UI** in the MVP — the persona picker is the only intake.

### What's mocked
- No model call. Pure keyword matching, deterministic.
- No multi-turn dialog. One input → one preferences object.
- No fallback for ambiguous inputs.

### Production version
- Swap `mockLLM` for an Anthropic SDK call (`@anthropic-ai/sdk`) using **Claude Haiku** for cost or **Sonnet** for quality.
- Use a structured-output schema matching `Persona['preferences']` exactly so the rest of the app (matcher, UI) needs zero changes.
- Multi-turn: retain partial preferences across turns until enough constraints are gathered.
- Keep the mock around as a fallback for offline tests and CI (`process.env.LLM_PROVIDER === 'mock'`).
- Cache by hash of the user input for the duration of the session to avoid redundant calls.

---

## Mock-vs-real ledger (one-screen summary)

| Feature                       | Mocked                                                  | Real                                  |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------- |
| Personas                      | 12 hand-authored JSON entries; no learning              | Schema, matcher integration           |
| Cars                          | ~30 hand-authored entries; no real-time inventory       | Schema, repo, type contract           |
| Matcher                       | Deterministic weighted scoring; no personalization      | Algorithm + transparent reasons       |
| YouTube IDs                   | Synthetic 11-char strings; not guaranteed to resolve    | Channel attribution copy              |
| Article URLs                  | Valid-looking paths; not verified to render             | Domain whitelist                      |
| Lead capture                  | SQLite, ephemeral on Vercel `/tmp`; no SMS/CRM/auth; anonymous (null `personaId`) accepted | Form, validation, DB schema           |
| View aggregation              | SQLite count; no bot filter; ephemeral on Vercel        | Schema, persona-scoped grouping       |
| Compare cart                  | localStorage only; no cross-device sync; no analytics   | UI, store interface, /compare page    |
| Persona flexibility           | Hand-authored `flexibility[]`; no learning loop         | Matcher hook (`FLEX_SCALE`), reasons  |
| Persona tweaks                | URL-only overrides; not persisted; no telemetry         | UI, validation, server-side re-rank   |
| LLM intake                    | Deterministic keyword matcher; not wired into UI        | `LLMProvider` interface contract      |
| Auth                          | None — anonymous lead capture                           | n/a                                   |
| Analytics                     | None                                                    | n/a                                   |
