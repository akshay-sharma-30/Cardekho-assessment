import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/repo';

// Slug shape: lowercase letters, digits, dashes. Matches our car ids
// ("maruti-swift-vxi") and rejects anything weird before it hits SQL.
const IdSchema = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);

// GET /api/cars/:id — car detail + aggregate stats. Pure read; no writes.
// View recording lives on the detail page itself via POST /api/views so that
// CDN/RSC prefetches and the /compare fan-out don't inflate counters.
// Status: real read + real aggregates. Mocked: ~30 hand-authored cars,
// ephemeral SQLite on Vercel. See FEATURES.md §2 + §6.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const idResult = IdSchema.safeParse(params.id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const car = repo.car(idResult.data);
    if (!car) {
      return NextResponse.json({ error: 'car_not_found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        car,
        totalViews: repo.totalViews(car.id),
        totalLeads: repo.totalLeads(car.id),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/cars/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
