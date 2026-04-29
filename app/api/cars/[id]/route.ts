import { NextResponse } from 'next/server';
import { repo } from '@/lib/repo';

// GET /api/cars/:id?persona=<id> — car detail + aggregate stats.
// Records a view event for analytics. Returns 404 if car missing.
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const car = repo.car(params.id);
    if (!car) {
      return NextResponse.json({ error: 'car_not_found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const personaId = url.searchParams.get('persona');

    // Fire-and-forget view recording. Wrapped so a write failure doesn't
    // break the read.
    try {
      repo.recordView({ carId: car.id, personaId: personaId || null });
    } catch (writeErr) {
      console.error('[GET /api/cars] recordView failed', writeErr);
    }

    return NextResponse.json({
      car,
      totalViews: repo.totalViews(car.id),
      totalLeads: repo.totalLeads(car.id),
    });
  } catch (err) {
    console.error('[GET /api/cars/:id]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
