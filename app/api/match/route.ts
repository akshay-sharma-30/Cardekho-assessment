import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/repo';
import { matchCarsToPersona } from '@/lib/matcher';
import type { MatchResponse } from '@/lib/types';

const Body = z.object({
  personaId: z.string().min(1),
});

// POST /api/match — given a personaId returns the scored shortlist.
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

    const persona = repo.persona(parsed.data.personaId);
    if (!persona) {
      return NextResponse.json({ error: 'persona_not_found' }, { status: 404 });
    }

    const cars = repo.allCars();
    const matches = matchCarsToPersona(persona, cars);
    const popular = repo.popularInPersona(persona.id, 3);

    const body: MatchResponse = {
      persona,
      matches,
      totalCandidates: cars.length,
      popularInPersona: popular,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error('[POST /api/match]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
