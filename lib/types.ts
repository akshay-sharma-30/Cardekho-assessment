// ──────────────────────────────────────────────────────────────────────────────
// Shared type contract.
// Every module — data, matcher, API routes, UI — agrees on these shapes.
// ──────────────────────────────────────────────────────────────────────────────

export type FuelType = 'petrol' | 'diesel' | 'cng' | 'hybrid' | 'electric';
export type Transmission = 'manual' | 'automatic';
export type BodyStyle = 'hatchback' | 'sedan' | 'suv' | 'muv' | 'compact-suv';

export interface Persona {
  id: string;            // slug: "young-family-metro"
  title: string;         // "New parent in the metro"
  tagline: string;       // short one-liner shown on card
  emoji: string;
  description: string;   // 1-2 sentences explaining the persona
  // Soft preferences expressed as a target spec — used by the matcher.
  preferences: {
    budgetMaxLakh: number;
    budgetMinLakh?: number;
    seats: number;
    fuel: FuelType[];           // acceptable fuels
    transmission?: Transmission; // preferred but not required
    body?: BodyStyle[];          // preferred body styles
    boot: 'small' | 'medium' | 'large';
    safetyMin: number;           // 1..5 stars
    fuelEfficiencyKmplMin?: number;
    parkingFriendly?: boolean;   // length < 4.0m bias
    highwayCommute?: boolean;    // bias toward refinement, AT, larger engines
  };
  // Curated highlights surfaced on the persona detail page.
  highlights: string[];
  /**
   * Preference fields the persona is willing to negotiate on. Used by the
   * matcher to scale down the weight of these criteria — mismatching them hurts
   * less. Use the literal field names from `preferences`.
   */
  flexibility?: Array<
    | 'budgetMaxLakh'
    | 'seats'
    | 'fuel'
    | 'transmission'
    | 'body'
    | 'boot'
    | 'safetyMin'
    | 'fuelEfficiencyKmplMin'
    | 'parkingFriendly'
    | 'highwayCommute'
  >;
}

export interface MediaLink {
  type: 'youtube' | 'article';
  title: string;
  source: string;     // "Autocar India", "PowerDrift", etc.
  url: string;
  // For YouTube, the video ID lets us embed the player and pull a thumbnail.
  youtubeId?: string;
  vetted: boolean;    // hand-curated as positive/balanced; UI can de-prioritise unvetted
}

export interface Car {
  id: string;                     // slug: "maruti-swift-vxi"
  brand: string;
  model: string;
  variant: string;
  body: BodyStyle;
  fuel: FuelType;
  transmission: Transmission;
  seats: number;
  priceLakh: number;              // ex-showroom, lakh INR
  fuelEfficiencyKmpl: number;
  safetyStars: number;            // 1..5
  bootLitres: number;
  lengthMm: number;
  groundClearanceMm: number;
  imageUrl: string;
  oneLiner: string;               // editorial sales line
  prosCons: { pros: string[]; cons: string[] };
  media: MediaLink[];             // curated reviews/articles
}

// ──────────────────────────────────────────────────────────────────────────────
// Matcher output: per car we attach a score and the reasons behind it so the UI
// can render a transparent "why this car" breakdown.
// ──────────────────────────────────────────────────────────────────────────────
export interface MatchReason {
  criterion: string;     // "budget", "seats", "fuel", "safety", ...
  passed: boolean;
  detail: string;        // human-readable: "Under ₹9L budget"
  weight: number;        // contribution to score
}

export interface MatchResult {
  car: Car;
  score: number;         // 0..100
  reasons: MatchReason[];
  fitTier: 'excellent' | 'strong' | 'good' | 'stretch';
}

// ──────────────────────────────────────────────────────────────────────────────
// Persistence: leads + view events.
// ──────────────────────────────────────────────────────────────────────────────
export interface Lead {
  id?: number;
  carId: string;
  personaId: string | null;
  intent: 'test_drive' | 'callback' | 'dealer_contact';
  name: string;
  phone: string;
  city: string | null;
  createdAt?: string;
}

export interface ViewEvent {
  id?: number;
  carId: string;
  personaId: string | null;
  createdAt?: string;
}

// API contract used by the frontend.
export interface MatchResponse {
  persona: Persona;
  matches: MatchResult[];
  totalCandidates: number;
  // Aggregated insights pulled from the leads/views tables.
  popularInPersona: { carId: string; views: number }[];
}
