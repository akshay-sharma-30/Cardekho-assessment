import { NextResponse } from 'next/server';
import { repo } from '@/lib/repo';

// GET /api/personas — list all personas for the homepage picker.
// Status: real read. Mocked: 12 hand-authored entries, no CMS, no localization.
// See FEATURES.md §1.
export async function GET() {
  try {
    const personas = repo.allPersonas();
    return NextResponse.json(
      { personas, count: personas.length },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (err) {
    console.error('[GET /api/personas]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
