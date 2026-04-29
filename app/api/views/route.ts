import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/repo';

const Body = z.object({
  carId: z.string().min(1),
  personaId: z.string().min(1).optional(),
});

// POST /api/views — record a car-detail view event for analytics.
// Status: real write. Mocked: no bot filter, no de-dup, no time decay,
// ephemeral on Vercel /tmp. See FEATURES.md §6.
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

    const { carId, personaId } = parsed.data;
    repo.recordView({ carId, personaId: personaId ?? null });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/views]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
