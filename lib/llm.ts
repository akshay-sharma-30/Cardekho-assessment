import 'server-only';

// ──────────────────────────────────────────────────────────────────────────────
// MOCK LLM PROVIDER.
//
// This is a deterministic, keyword-based stand-in for a real model call.
// The interface (`LLMProvider.extractPreferences`) is what matters — swap in
// an OpenAI/Anthropic-backed implementation in production. See docs/FEATURES.md
// for the production switch plan.
// ──────────────────────────────────────────────────────────────────────────────

import type { Persona } from './types';

export interface LLMProvider {
  extractPreferences(input: string): Promise<Partial<Persona['preferences']>>;
}

export const mockLLM: LLMProvider = {
  async extractPreferences(input: string): Promise<Partial<Persona['preferences']>> {
    const text = input.toLowerCase();
    const out: Partial<Persona['preferences']> = {};

    // Family / kids → 5 seats minimum
    if (/\b(family|kids?|child(ren)?|baby|parents?)\b/.test(text)) {
      out.seats = 5;
    }
    // Big family → 7 seats
    if (/\b(7[ -]?seater|seven seats?|joint family|big family)\b/.test(text)) {
      out.seats = 7;
    }

    // Highway / long drive
    if (/\b(highway|long drive|long commute|inter[ -]?city|road trip)\b/.test(text)) {
      out.highwayCommute = true;
    }

    // Tight parking / metro
    if (/\b(tight parking|small streets?|parking|narrow|metro|compact|city only)\b/.test(text)) {
      out.parkingFriendly = true;
    }

    // Budget — try to parse "under 10 lakh", "₹15L", "12 lakhs", "around 8L"
    const budgetMatch = text.match(/(?:under|below|max|around|budget(?: of)?|upto|~|₹|rs\.?)\s*([0-9]{1,2}(?:\.[0-9])?)\s*l(?:akh)?s?/i);
    if (budgetMatch) {
      out.budgetMaxLakh = parseFloat(budgetMatch[1]);
    } else {
      // Fallback: any "<num> lakh" mention
      const fallback = text.match(/([0-9]{1,2}(?:\.[0-9])?)\s*(?:l|lakh)s?\b/i);
      if (fallback) out.budgetMaxLakh = parseFloat(fallback[1]);
    }

    // Fuel keywords
    const fuel: Persona['preferences']['fuel'] = [];
    if (/\bpetrol\b/.test(text)) fuel.push('petrol');
    if (/\bdiesel\b/.test(text)) fuel.push('diesel');
    if (/\b(hybrid|strong[ -]?hybrid)\b/.test(text)) fuel.push('hybrid');
    if (/\b(ev|electric)\b/.test(text)) fuel.push('electric');
    if (/\bcng\b/.test(text)) fuel.push('cng');
    if (fuel.length) out.fuel = fuel;

    // Transmission
    if (/\b(automatic|at\b|amt|cvt|dct|dsg|self[ -]?shift)\b/.test(text)) {
      out.transmission = 'automatic';
    } else if (/\b(manual|mt\b|stick shift)\b/.test(text)) {
      out.transmission = 'manual';
    }

    // Safety
    if (/\b(safe|safety|ncap|airbags?|5[ -]?star)\b/.test(text)) {
      out.safetyMin = 4;
    }

    // Fuel efficiency / mileage
    if (/\b(mileage|fuel efficient|economical|kmpl|sips fuel|sip fuel)\b/.test(text)) {
      out.fuelEfficiencyKmplMin = 18;
    }

    return out;
  },
};
