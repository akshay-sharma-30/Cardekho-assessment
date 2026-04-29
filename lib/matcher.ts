import 'server-only';

// ──────────────────────────────────────────────────────────────────────────────
// Persona ↔ Car matcher.
//
// Goal: turn a Persona's preferences + a Car's spec into a transparent score
// the UI can render reasoning for. Scores total 100 across nine criteria.
//
//   budget         25   (hard fail beyond +25%)
//   seats          15   (hard fail if seats < required)
//   safety         15
//   efficiency     10
//   fuel           10
//   transmission   10
//   boot            5
//   parking         5
//   highway         5
//   ─────────────── ───
//                 100
//
// Soft preferences (transmission, body, parking, highway) award the full
// criterion weight on a clean match, half if the persona is neutral about it,
// zero if mismatched. Hard fails force score=0 / fitTier='stretch'.
// ──────────────────────────────────────────────────────────────────────────────

import type { Car, MatchReason, MatchResult, Persona } from './types';

// Tier thresholds. Sanity check: 85 ≈ matches everything bar one minor weighted
// criterion; 70 ≈ hits all hard requirements + most soft prefs; 55 ≈ acceptable
// compromises; below that we flag 'stretch' so the UI can warn the buyer.
const TIER_EXCELLENT = 85;
const TIER_STRONG = 70;
const TIER_GOOD = 55;

// Flexibility multiplier — when a persona lists a preference field as
// flexible, the corresponding criterion's effective weight is scaled by this
// factor. Mismatching a flexible criterion still hurts, just half as much.
// Net effect: a persona with flexibility is MORE permissive — more cars score
// above the 'stretch' line because mismatches cost less.
const FLEX_SCALE = 0.5;

// Map from MatchReason.criterion → the underlying preferences field name.
// Used to look up whether a criterion is flexible for the persona.
const CRITERION_TO_PREF: Record<
  string,
  NonNullable<Persona['flexibility']>[number]
> = {
  budget: 'budgetMaxLakh',
  seats: 'seats',
  fuel: 'fuel',
  transmission: 'transmission',
  safety: 'safetyMin',
  efficiency: 'fuelEfficiencyKmplMin',
  boot: 'boot',
  parking: 'parkingFriendly',
  highway: 'highwayCommute',
  body: 'body',
};

// Boot size buckets in litres. Sanity: 'small' ≈ a hatch (240-330), 'medium'
// ≈ compact-SUV / sedan (330-450), 'large' ≈ full SUV / sedan (450+).
const BOOT_LARGE_MIN = 450;
const BOOT_MEDIUM_MIN = 330;

// Output cap. UI may slice further to top 3.
const MAX_RESULTS = 8;

function bucketBoot(litres: number): 'small' | 'medium' | 'large' {
  if (litres >= BOOT_LARGE_MIN) return 'large';
  if (litres >= BOOT_MEDIUM_MIN) return 'medium';
  return 'small';
}

function bootRank(b: 'small' | 'medium' | 'large'): number {
  return b === 'small' ? 0 : b === 'medium' ? 1 : 2;
}

export function matchCarsToPersona(persona: Persona, cars: Car[]): MatchResult[] {
  const prefs = persona.preferences;
  // Persona-level: which preferences are negotiable? Used below to scale the
  // weight of any criterion whose underlying pref is in this set, halving
  // its impact (both the contribution and the displayed weight) so that a
  // mismatch hurts less. Net effect: flexibility makes a persona MORE
  // permissive — a borderline car keeps a higher net score because flexible
  // mismatches cost less, so more cars rank above the 'stretch' line.
  const flexible = new Set<string>(persona.flexibility ?? []);

  const results: MatchResult[] = cars.map((car) => {
    // Build raw (unscaled) reasons + their score contributions first, then
    // apply flexibility scaling per-criterion at the end. Each entry holds:
    //   criterion       — the MatchReason.criterion string
    //   contribution    — raw points scored (0..weight)
    //   weight          — full criterion weight (pre-scaling)
    //   passed/detail   — display fields for the reason
    type RawEntry = {
      criterion: string;
      contribution: number;
      weight: number;
      passed: boolean;
      detail: string;
    };
    const raw: RawEntry[] = [];
    let hardFail = false;
    // Body is a soft modifier (penalty / no weight); kept separate so the
    // flex-scaling pass doesn't apply to its zero-weight reason rows.
    let bodyPenalty = 0;
    let bodyReason: MatchReason | null = null;

    // ─── 1. Budget (weight 25) ──────────────────────────────────────────
    // Sanity: a car at exactly budgetMaxLakh gets full marks. Up to +10%
    // it tapers from full→half. Beyond +25% is a hard fail (force 0).
    const budgetWeight = 25;
    const overBy = (car.priceLakh - prefs.budgetMaxLakh) / prefs.budgetMaxLakh;
    if (overBy > 0.25) {
      raw.push({
        criterion: 'budget',
        contribution: 0,
        weight: budgetWeight,
        passed: false,
        detail: `₹${car.priceLakh}L — way over your ₹${prefs.budgetMaxLakh}L budget`,
      });
      hardFail = true;
    } else if (overBy <= 0) {
      // Comfortably within budget (or right at the cap) — full marks.
      raw.push({
        criterion: 'budget',
        contribution: budgetWeight,
        weight: budgetWeight,
        passed: true,
        detail: `₹${car.priceLakh}L — comfortably under your ₹${prefs.budgetMaxLakh}L budget`,
      });
    } else if (overBy <= 0.1) {
      // A small stretch — half marks.
      raw.push({
        criterion: 'budget',
        contribution: budgetWeight * 0.5,
        weight: budgetWeight,
        passed: true,
        detail: `₹${car.priceLakh}L — a slight stretch above ₹${prefs.budgetMaxLakh}L`,
      });
    } else {
      // 10–25% over: 25% marks; flagged but not fatal.
      raw.push({
        criterion: 'budget',
        contribution: budgetWeight * 0.25,
        weight: budgetWeight,
        passed: false,
        detail: `₹${car.priceLakh}L — meaningfully over your ₹${prefs.budgetMaxLakh}L budget`,
      });
    }

    // ─── 2. Seats (weight 15) ───────────────────────────────────────────
    // Hard fail if the car can't seat the family. Bonus for matching
    // exactly (no wasted bulk).
    const seatsWeight = 15;
    if (car.seats < prefs.seats) {
      raw.push({
        criterion: 'seats',
        contribution: 0,
        weight: seatsWeight,
        passed: false,
        detail: `${car.seats} seats — not enough for your ${prefs.seats}-seat need`,
      });
      hardFail = true;
    } else if (car.seats === prefs.seats) {
      raw.push({
        criterion: 'seats',
        contribution: seatsWeight,
        weight: seatsWeight,
        passed: true,
        detail: `${car.seats} seats — fits the brief exactly`,
      });
    } else {
      // Bigger than asked for — full marks but framed as a bonus.
      raw.push({
        criterion: 'seats',
        contribution: seatsWeight,
        weight: seatsWeight,
        passed: true,
        detail: `${car.seats} seats — extra room over your ${prefs.seats}-seat need`,
      });
    }

    // ─── 3. Safety (weight 15) ──────────────────────────────────────────
    // Beat the persona's minimum stars: full marks. Match exactly: 80%.
    // Below: linear taper so you still get partial credit.
    const safetyWeight = 15;
    if (car.safetyStars > prefs.safetyMin) {
      raw.push({
        criterion: 'safety',
        contribution: safetyWeight,
        weight: safetyWeight,
        passed: true,
        detail: `${car.safetyStars}-star safety — beats your ${prefs.safetyMin}-star minimum`,
      });
    } else if (car.safetyStars === prefs.safetyMin) {
      raw.push({
        criterion: 'safety',
        contribution: safetyWeight * 0.8,
        weight: safetyWeight,
        passed: true,
        detail: `${car.safetyStars}-star safety — meets your minimum`,
      });
    } else {
      // Each star below is -25% of the criterion weight.
      const gap = prefs.safetyMin - car.safetyStars;
      const partial = Math.max(0, safetyWeight * (1 - 0.25 * gap));
      raw.push({
        criterion: 'safety',
        contribution: partial,
        weight: safetyWeight,
        passed: false,
        detail: `${car.safetyStars}-star safety — below your ${prefs.safetyMin}-star minimum`,
      });
    }

    // ─── 4. Fuel efficiency (weight 10) ─────────────────────────────────
    const efficiencyWeight = 10;
    if (prefs.fuelEfficiencyKmplMin) {
      if (car.fuelEfficiencyKmpl >= prefs.fuelEfficiencyKmplMin) {
        raw.push({
          criterion: 'efficiency',
          contribution: efficiencyWeight,
          weight: efficiencyWeight,
          passed: true,
          detail: `${car.fuelEfficiencyKmpl} kmpl — easily clears ${prefs.fuelEfficiencyKmplMin} kmpl target`,
        });
      } else {
        // Sanity: 4 kmpl shortfall → 0 marks; smaller gap → linear partial.
        const ratio = car.fuelEfficiencyKmpl / prefs.fuelEfficiencyKmplMin;
        const partial = Math.max(0, efficiencyWeight * ratio - efficiencyWeight * 0.5);
        raw.push({
          criterion: 'efficiency',
          contribution: Math.max(0, partial),
          weight: efficiencyWeight,
          passed: false,
          detail: `${car.fuelEfficiencyKmpl} kmpl — below your ${prefs.fuelEfficiencyKmplMin} kmpl target`,
        });
      }
    } else {
      // No explicit target — half credit (neutral).
      raw.push({
        criterion: 'efficiency',
        contribution: efficiencyWeight * 0.5,
        weight: efficiencyWeight,
        passed: true,
        detail: `${car.fuelEfficiencyKmpl} kmpl — neutral on efficiency for this persona`,
      });
    }

    // ─── 5. Fuel type (weight 10) ───────────────────────────────────────
    const fuelWeight = 10;
    if (prefs.fuel.includes(car.fuel)) {
      raw.push({
        criterion: 'fuel',
        contribution: fuelWeight,
        weight: fuelWeight,
        passed: true,
        detail: `${car.fuel} — matches your acceptable fuels`,
      });
    } else {
      raw.push({
        criterion: 'fuel',
        contribution: 0,
        weight: fuelWeight,
        passed: false,
        detail: `${car.fuel} — not in your acceptable fuel list`,
      });
    }

    // ─── 6. Transmission (weight 10) — soft preference ──────────────────
    const transmissionWeight = 10;
    if (!prefs.transmission) {
      // Persona neutral → half marks.
      raw.push({
        criterion: 'transmission',
        contribution: transmissionWeight * 0.5,
        weight: transmissionWeight,
        passed: true,
        detail: `${car.transmission} — no strong preference`,
      });
    } else if (prefs.transmission === car.transmission) {
      raw.push({
        criterion: 'transmission',
        contribution: transmissionWeight,
        weight: transmissionWeight,
        passed: true,
        detail: `${car.transmission} — matches your preference`,
      });
    } else {
      raw.push({
        criterion: 'transmission',
        contribution: 0,
        weight: transmissionWeight,
        passed: false,
        detail: `${car.transmission} — you prefer ${prefs.transmission}`,
      });
    }

    // ─── 7. Boot (weight 5) ─────────────────────────────────────────────
    const bootWeight = 5;
    const carBoot = bucketBoot(car.bootLitres);
    if (bootRank(carBoot) >= bootRank(prefs.boot)) {
      raw.push({
        criterion: 'boot',
        contribution: bootWeight,
        weight: bootWeight,
        passed: true,
        detail: `${car.bootLitres}L boot — enough for your ${prefs.boot} need`,
      });
    } else {
      // One bucket short → half; two short → zero.
      const gap = bootRank(prefs.boot) - bootRank(carBoot);
      const partial = Math.max(0, bootWeight * (1 - 0.5 * gap));
      raw.push({
        criterion: 'boot',
        contribution: partial,
        weight: bootWeight,
        passed: false,
        detail: `${car.bootLitres}L boot — smaller than your ${prefs.boot} need`,
      });
    }

    // ─── 8. Parking-friendly (weight 5) — soft preference ───────────────
    // Sanity: anything < 4000mm is "easy" to park; over 4400mm hurts.
    const parkingWeight = 5;
    if (prefs.parkingFriendly == null) {
      raw.push({
        criterion: 'parking',
        contribution: parkingWeight * 0.5,
        weight: parkingWeight,
        passed: true,
        detail: 'Parking ease — not a priority for you',
      });
    } else if (prefs.parkingFriendly) {
      if (car.lengthMm < 4000) {
        raw.push({
          criterion: 'parking',
          contribution: parkingWeight,
          weight: parkingWeight,
          passed: true,
          detail: `${car.lengthMm}mm long — easy in tight metro spots`,
        });
      } else if (car.lengthMm < 4400) {
        raw.push({
          criterion: 'parking',
          contribution: parkingWeight * 0.5,
          weight: parkingWeight,
          passed: true,
          detail: `${car.lengthMm}mm long — manageable but not tiny`,
        });
      } else {
        raw.push({
          criterion: 'parking',
          contribution: 0,
          weight: parkingWeight,
          passed: false,
          detail: `${car.lengthMm}mm long — tough in tight parking`,
        });
      }
    } else {
      // Persona explicitly doesn't care — full marks.
      raw.push({
        criterion: 'parking',
        contribution: parkingWeight,
        weight: parkingWeight,
        passed: true,
        detail: `${car.lengthMm}mm long — parking ease isn't a priority`,
      });
    }

    // ─── 9. Highway commute (weight 5) — soft preference ────────────────
    // Bias: longer car (>4400mm), AT gearbox, refined fuel (diesel/hybrid).
    const highwayWeight = 5;
    if (prefs.highwayCommute == null) {
      raw.push({
        criterion: 'highway',
        contribution: highwayWeight * 0.5,
        weight: highwayWeight,
        passed: true,
        detail: 'Highway manners — neutral for this persona',
      });
    } else if (prefs.highwayCommute) {
      let highwayScore = 0;
      if (car.lengthMm >= 4400) highwayScore += highwayWeight * 0.4;
      if (car.transmission === 'automatic') highwayScore += highwayWeight * 0.3;
      if (car.fuel === 'diesel' || car.fuel === 'hybrid') highwayScore += highwayWeight * 0.3;
      raw.push({
        criterion: 'highway',
        contribution: highwayScore,
        weight: highwayWeight,
        passed: highwayScore >= highwayWeight * 0.6,
        detail:
          highwayScore >= highwayWeight * 0.6
            ? `Refined for long highway runs`
            : `Less ideal for daily highway commute`,
      });
    } else {
      // City-only persona — full marks.
      raw.push({
        criterion: 'highway',
        contribution: highwayWeight,
        weight: highwayWeight,
        passed: true,
        detail: 'Highway commute not a priority',
      });
    }

    // Body preference acts as a soft modifier on the boot/parking/highway
    // group rather than its own weighted criterion (else it'd inflate
    // matches that already passed the related axes). When body mismatches
    // we just nudge the score down by 5 points capped non-negative — a
    // single weight pulled from the soft pool. If 'body' is in the
    // persona's flexibility list, halve the penalty too (and tag the
    // reason " · flexible" below) so a flexible body mismatch hurts less.
    if (prefs.body && !prefs.body.includes(car.body)) {
      const bodyFlex = flexible.has('body');
      bodyPenalty = bodyFlex ? 5 * FLEX_SCALE : 5;
      bodyReason = {
        criterion: 'body',
        passed: false,
        detail:
          `${car.body} — you preferred ${prefs.body.join(' / ')}` +
          (bodyFlex ? ' · flexible' : ''),
        weight: 0,
      };
    } else if (prefs.body) {
      const bodyFlex = flexible.has('body');
      bodyReason = {
        criterion: 'body',
        passed: true,
        detail:
          `${car.body} — matches your preferred body style` +
          (bodyFlex ? ' · flexible' : ''),
        weight: 0,
      };
    }

    // ─── Apply flexibility scaling and accumulate score ──────────────────
    // For each criterion, if its underlying preference is flagged flexible
    // by the persona, scale BOTH the contribution and the displayed weight
    // by FLEX_SCALE. The reason's detail string is annotated " · flexible"
    // so the UI can show why this row is downweighted. The criterion still
    // contributes — mismatching just hurts half as much.
    let score = 0;
    const reasons: MatchReason[] = raw.map((r) => {
      const prefField = CRITERION_TO_PREF[r.criterion];
      const isFlex = prefField !== undefined && flexible.has(prefField);
      const scale = isFlex ? FLEX_SCALE : 1;
      score += r.contribution * scale;
      return {
        criterion: r.criterion,
        passed: r.passed,
        detail: isFlex ? `${r.detail} · flexible` : r.detail,
        weight: r.weight * scale,
      };
    });

    // Tack on body penalty / reason after weighted criteria.
    if (bodyPenalty > 0) score = Math.max(0, score - bodyPenalty);
    if (bodyReason) reasons.push(bodyReason);

    // ─── Hard-fail override ─────────────────────────────────────────────
    // Hard fails (budget +25%, seats < required) ignore flexibility — those
    // rules still force score=0 and tier='stretch' regardless.
    if (hardFail) score = 0;

    // Cap at 100. Flexibility scaling can never push the score above 100
    // (it only ever scales weights DOWN), but keep the cap as a safety net.
    score = Math.min(100, score);

    // ─── Tier ───────────────────────────────────────────────────────────
    const tier: MatchResult['fitTier'] = hardFail
      ? 'stretch'
      : score >= TIER_EXCELLENT
        ? 'excellent'
        : score >= TIER_STRONG
          ? 'strong'
          : score >= TIER_GOOD
            ? 'good'
            : 'stretch';

    return { car, score: Math.round(score), reasons, fitTier: tier };
  });

  // Sort highest first, cap output.
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, MAX_RESULTS);
}
