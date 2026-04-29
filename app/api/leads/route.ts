import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/repo';

const Body = z.object({
  carId: z.string().min(1),
  // `.nullish()` so the client can send either `null` (anonymous lead, no
  // persona context) or omit the key entirely. See FEATURES.md §5.
  personaId: z.string().min(1).nullish(),
  intent: z.enum(['test_drive', 'callback', 'dealer_contact']),
  name: z.string().min(2).max(80),
  // 10-digit Indian mobile number; allows optional leading +91 / 0.
  phone: z.string().regex(/^[6-9]\d{9}$/, '10-digit Indian mobile required'),
  city: z.string().min(2).max(60).optional(),
});

// POST /api/leads — capture a buyer intent (test drive, callback, dealer).
// Status: real validation + DB write. Mocked: no OTP, no CRM webhook, no rate
// limit, ephemeral on Vercel /tmp. See FEATURES.md §5.
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

    const { carId, personaId, intent, name, phone, city } = parsed.data;
    const id = repo.createLead({
      carId,
      personaId: personaId ?? null,
      intent,
      name,
      phone,
      city: city ?? null,
    });

    return NextResponse.json({ id, ok: true });
  } catch (err) {
    console.error('[POST /api/leads]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
