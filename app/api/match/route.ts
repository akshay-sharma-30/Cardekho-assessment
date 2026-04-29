import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/repo';
import { matchCarsToPersona } from '@/lib/matcher';
import type { MatchResponse } from '@/lib/types';

const Body = z.object({
  personaId: z.string().min(1),
  // Page size for the returned shortlist. Matcher always scores the full
  // catalog (sorted by score), then we slice. Default sized for the UI's
  // top-N grid; cap prevents pathological payloads as the catalog grows.
  limit: z.number().int().min(1).max(100).default(24),
});

// POST /api/match — given a personaId returns the scored shortlist.
// Status: real matcher + real persona/car data. Mocked: hand-tuned weights,
// no learned ranker, no personalization beyond the persona. See FEATURES.md §2.
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { personaId, limit } = parsed.data;
    const persona = repo.persona(personaId);
    if (!persona) {
      return NextResponse.json({ error: 'persona_not_found' }, { status: 404 });
    }

    const cars = repo.allCars();
    const allMatches = matchCarsToPersona(persona, cars);
    const matches = allMatches.slice(0, limit);
    const popular = repo.popularInPersona(persona.id, 3);

    const body: MatchResponse = {
      persona,
      matches,
      totalCandidates: cars.length,
      popularInPersona: popular,
      meta: {
        limit,
        total: allMatches.length,
        hasMore: allMatches.length > matches.length,
      },
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error('[POST /api/match]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
