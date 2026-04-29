import { NextResponse } from 'next/server';
import { repo } from '@/lib/repo';

// GET /api/personas — list all personas for the homepage picker.
export async function GET() {
  try {
    const personas = repo.allPersonas();
    return NextResponse.json({ personas });
  } catch (err) {
    console.error('[GET /api/personas]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
