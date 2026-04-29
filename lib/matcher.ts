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

  const results: MatchResult[] = cars.map((car) => {
    const reasons: MatchReason[] = [];
    let score = 0;
    let hardFail = false;

    // ─── 1. Budget (weight 25) ──────────────────────────────────────────
    // Sanity: a car at exactly budgetMaxLakh gets full marks. Up to +10%
    // it tapers from full→half. Beyond +25% is a hard fail (force 0).
    const budgetWeight = 25;
    const overBy = (car.priceLakh - prefs.budgetMaxLakh) / prefs.budgetMaxLakh;
    if (overBy > 0.25) {
      reasons.push({
        criterion: 'budget',
        passed: false,
        detail: `₹${car.priceLakh}L — way over your ₹${prefs.budgetMaxLakh}L budget`,
        weight: budgetWeight,
      });
      hardFail = true;
    } else if (overBy <= 0) {
      // Comfortably within budget (or right at the cap) — full marks.
      score += budgetWeight;
      reasons.push({
        criterion: 'budget',
        passed: true,
        detail: `₹${car.priceLakh}L — comfortably under your ₹${prefs.budgetMaxLakh}L budget`,
        weight: budgetWeight,
      });
    } else if (overBy <= 0.1) {
      // A small stretch — half marks.
      score += budgetWeight * 0.5;
      reasons.push({
        criterion: 'budget',
        passed: true,
        detail: `₹${car.priceLakh}L — a slight stretch above ₹${prefs.budgetMaxLakh}L`,
        weight: budgetWeight,
      });
    } else {
      // 10–25% over: 25% marks; flagged but not fatal.
      score += budgetWeight * 0.25;
      reasons.push({
        criterion: 'budget',
        passed: false,
        detail: `₹${car.priceLakh}L — meaningfully over your ₹${prefs.budgetMaxLakh}L budget`,
        weight: budgetWeight,
      });
    }

    // ─── 2. Seats (weight 15) ───────────────────────────────────────────
    // Hard fail if the car can't seat the family. Bonus for matching
    // exactly (no wasted bulk).
    const seatsWeight = 15;
    if (car.seats < prefs.seats) {
      reasons.push({
        criterion: 'seats',
        passed: false,
        detail: `${car.seats} seats — not enough for your ${prefs.seats}-seat need`,
        weight: seatsWeight,
      });
      hardFail = true;
    } else if (car.seats === prefs.seats) {
      score += seatsWeight;
      reasons.push({
        criterion: 'seats',
        passed: true,
        detail: `${car.seats} seats — fits the brief exactly`,
        weight: seatsWeight,
      });
    } else {
      // Bigger than asked for — full marks but framed as a bonus.
      score += seatsWeight;
      reasons.push({
        criterion: 'seats',
        passed: true,
        detail: `${car.seats} seats — extra room over your ${prefs.seats}-seat need`,
        weight: seatsWeight,
      });
    }

    // ─── 3. Safety (weight 15) ──────────────────────────────────────────
    // Beat the persona's minimum stars: full marks. Match exactly: 80%.
    // Below: linear taper so you still get partial credit.
    const safetyWeight = 15;
    if (car.safetyStars > prefs.safetyMin) {
      score += safetyWeight;
      reasons.push({
        criterion: 'safety',
        passed: true,
        detail: `${car.safetyStars}-star safety — beats your ${prefs.safetyMin}-star minimum`,
        weight: safetyWeight,
      });
    } else if (car.safetyStars === prefs.safetyMin) {
      score += safetyWeight * 0.8;
      reasons.push({
        criterion: 'safety',
        passed: true,
        detail: `${car.safetyStars}-star safety — meets your minimum`,
        weight: safetyWeight,
      });
    } else {
      // Each star below is -25% of the criterion weight.
      const gap = prefs.safetyMin - car.safetyStars;
      const partial = Math.max(0, safetyWeight * (1 - 0.25 * gap));
      score += partial;
      reasons.push({
        criterion: 'safety',
        passed: false,
        detail: `${car.safetyStars}-star safety — below your ${prefs.safetyMin}-star minimum`,
        weight: safetyWeight,
      });
    }

    // ─── 4. Fuel efficiency (weight 10) ─────────────────────────────────
    const efficiencyWeight = 10;
    if (prefs.fuelEfficiencyKmplMin) {
      if (car.fuelEfficiencyKmpl >= prefs.fuelEfficiencyKmplMin) {
        score += efficiencyWeight;
        reasons.push({
          criterion: 'efficiency',
          passed: true,
          detail: `${car.fuelEfficiencyKmpl} kmpl — easily clears ${prefs.fuelEfficiencyKmplMin} kmpl target`,
          weight: efficiencyWeight,
        });
      } else {
        // Sanity: 4 kmpl shortfall → 0 marks; smaller gap → linear partial.
        const ratio = car.fuelEfficiencyKmpl / prefs.fuelEfficiencyKmplMin;
        const partial = Math.max(0, efficiencyWeight * ratio - efficiencyWeight * 0.5);
        score += Math.max(0, partial);
        reasons.push({
          criterion: 'efficiency',
          passed: false,
          detail: `${car.fuelEfficiencyKmpl} kmpl — below your ${prefs.fuelEfficiencyKmplMin} kmpl target`,
          weight: efficiencyWeight,
        });
      }
    } else {
      // No explicit target — half credit (neutral).
      score += efficiencyWeight * 0.5;
      reasons.push({
        criterion: 'efficiency',
        passed: true,
        detail: `${car.fuelEfficiencyKmpl} kmpl — neutral on efficiency for this persona`,
        weight: efficiencyWeight,
      });
    }

    // ─── 5. Fuel type (weight 10) ───────────────────────────────────────
    const fuelWeight = 10;
    if (prefs.fuel.includes(car.fuel)) {
      score += fuelWeight;
      reasons.push({
        criterion: 'fuel',
        passed: true,
        detail: `${car.fuel} — matches your acceptable fuels`,
        weight: fuelWeight,
      });
    } else {
      reasons.push({
        criterion: 'fuel',
        passed: false,
        detail: `${car.fuel} — not in your acceptable fuel list`,
        weight: fuelWeight,
      });
    }

    // ─── 6. Transmission (weight 10) — soft preference ──────────────────
    const transmissionWeight = 10;
    if (!prefs.transmission) {
      // Persona neutral → half marks.
      score += transmissionWeight * 0.5;
      reasons.push({
        criterion: 'transmission',
        passed: true,
        detail: `${car.transmission} — no strong preference`,
        weight: transmissionWeight,
      });
    } else if (prefs.transmission === car.transmission) {
      score += transmissionWeight;
      reasons.push({
        criterion: 'transmission',
        passed: true,
        detail: `${car.transmission} — matches your preference`,
        weight: transmissionWeight,
      });
    } else {
      reasons.push({
        criterion: 'transmission',
        passed: false,
        detail: `${car.transmission} — you prefer ${prefs.transmission}`,
        weight: transmissionWeight,
      });
    }

    // ─── 7. Boot (weight 5) ─────────────────────────────────────────────
    const bootWeight = 5;
    const carBoot = bucketBoot(car.bootLitres);
    if (bootRank(carBoot) >= bootRank(prefs.boot)) {
      score += bootWeight;
      reasons.push({
        criterion: 'boot',
        passed: true,
        detail: `${car.bootLitres}L boot — enough for your ${prefs.boot} need`,
        weight: bootWeight,
      });
    } else {
      // One bucket short → half; two short → zero.
      const gap = bootRank(prefs.boot) - bootRank(carBoot);
      const partial = Math.max(0, bootWeight * (1 - 0.5 * gap));
      score += partial;
      reasons.push({
        criterion: 'boot',
        passed: false,
        detail: `${car.bootLitres}L boot — smaller than your ${prefs.boot} need`,
        weight: bootWeight,
      });
    }

    // ─── 8. Parking-friendly (weight 5) — soft preference ───────────────
    // Sanity: anything < 4000mm is "easy" to park; over 4400mm hurts.
    const parkingWeight = 5;
    if (prefs.parkingFriendly == null) {
      score += parkingWeight * 0.5; // neutral half
      reasons.push({
        criterion: 'parking',
        passed: true,
        detail: 'Parking ease — not a priority for you',
        weight: parkingWeight,
      });
    } else if (prefs.parkingFriendly) {
      if (car.lengthMm < 4000) {
        score += parkingWeight;
        reasons.push({
          criterion: 'parking',
          passed: true,
          detail: `${car.lengthMm}mm long — easy in tight metro spots`,
          weight: parkingWeight,
        });
      } else if (car.lengthMm < 4400) {
        score += parkingWeight * 0.5;
        reasons.push({
          criterion: 'parking',
          passed: true,
          detail: `${car.lengthMm}mm long — manageable but not tiny`,
          weight: parkingWeight,
        });
      } else {
        reasons.push({
          criterion: 'parking',
          passed: false,
          detail: `${car.lengthMm}mm long — tough in tight parking`,
          weight: parkingWeight,
        });
      }
    } else {
      // Persona explicitly doesn't care — full marks.
      score += parkingWeight;
      reasons.push({
        criterion: 'parking',
        passed: true,
        detail: `${car.lengthMm}mm long — parking ease isn't a priority`,
        weight: parkingWeight,
      });
    }

    // ─── 9. Highway commute (weight 5) — soft preference ────────────────
    // Bias: longer car (>4400mm), AT gearbox, refined fuel (diesel/hybrid).
    const highwayWeight = 5;
    if (prefs.highwayCommute == null) {
      score += highwayWeight * 0.5;
      reasons.push({
        criterion: 'highway',
        passed: true,
        detail: 'Highway manners — neutral for this persona',
        weight: highwayWeight,
      });
    } else if (prefs.highwayCommute) {
      let highwayScore = 0;
      if (car.lengthMm >= 4400) highwayScore += highwayWeight * 0.4;
      if (car.transmission === 'automatic') highwayScore += highwayWeight * 0.3;
      if (car.fuel === 'diesel' || car.fuel === 'hybrid') highwayScore += highwayWeight * 0.3;
      score += highwayScore;
      reasons.push({
        criterion: 'highway',
        passed: highwayScore >= highwayWeight * 0.6,
        detail:
          highwayScore >= highwayWeight * 0.6
            ? `Refined for long highway runs`
            : `Less ideal for daily highway commute`,
        weight: highwayWeight,
      });
    } else {
      // City-only persona — full marks.
      score += highwayWeight;
      reasons.push({
        criterion: 'highway',
        passed: true,
        detail: 'Highway commute not a priority',
        weight: highwayWeight,
      });
    }

    // Body preference acts as a soft modifier on the boot/parking/highway
    // group rather than its own weighted criterion (else it'd inflate
    // matches that already passed the related axes). When body mismatches
    // we just nudge the score down by 5 points capped non-negative — a
    // single weight pulled from the soft pool.
    if (prefs.body && !prefs.body.includes(car.body)) {
      score = Math.max(0, score - 5);
      reasons.push({
        criterion: 'body',
        passed: false,
        detail: `${car.body} — you preferred ${prefs.body.join(' / ')}`,
        weight: 0,
      });
    } else if (prefs.body) {
      reasons.push({
        criterion: 'body',
        passed: true,
        detail: `${car.body} — matches your preferred body style`,
        weight: 0,
      });
    }

    // ─── Hard-fail override ─────────────────────────────────────────────
    if (hardFail) score = 0;

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
