'use client';

import { useState, type FormEvent } from 'react';

interface Props {
  carId: string;
  personaId?: string;
}

type Intent = 'test_drive' | 'callback' | 'dealer_contact';

const INTENT_OPTIONS: { value: Intent; label: string }[] = [
  { value: 'test_drive', label: 'Book a test drive' },
  { value: 'callback', label: 'Call me back' },
  { value: 'dealer_contact', label: 'Connect with dealer' },
];

const PHONE_RE = /^[6-9]\d{9}$/;

interface FieldErrors {
  name?: string;
  phone?: string;
  city?: string;
}

// Normalise raw user input into a clean 10-digit mobile (or whatever they typed).
// Allows leading +91 / 91 / 0. Non-digits are stripped.
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length > 10) return digits.slice(2);
  if (digits.startsWith('0') && digits.length > 10) return digits.slice(1);
  return digits;
}

// Editorial toggle button — mirrored from PersonaTweakPanel's inline ToggleButton.
function ToggleButton({
  active,
  onClick,
  children,
  id,
  ariaPressed,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id?: string;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      aria-pressed={ariaPressed ?? active}
      className={`font-mono text-[10px] uppercase tracking-kicker px-3 py-2 border transition-all duration-300 ${
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-paper text-ink-soft border-rule hover:border-ink hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function LeadForm({ carId, personaId }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [intent, setIntent] = useState<Intent>('test_drive');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; id?: string } | null>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (name.trim().length < 2) {
      next.name = 'Please enter your full name';
    }
    const cleanPhone = normalisePhone(phone);
    if (!PHONE_RE.test(cleanPhone)) {
      next.phone = 'Enter a valid 10-digit Indian mobile';
    }
    return next;
  }

  function resetForm() {
    setName('');
    setPhone('');
    setCity('');
    setIntent('test_drive');
    setErrors({});
    setServerError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const cleanPhone = normalisePhone(phone);
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          personaId: personaId ?? null,
          intent,
          name: name.trim(),
          phone: cleanPhone,
          city: city.trim() || undefined,
        }),
      });

      if (!res.ok) {
        let message = "We couldn't reach the desk. Please try again.";
        try {
          const data = (await res.json()) as { error?: string; errors?: Record<string, string> };
          if (data.error && data.error !== 'invalid_input') message = data.error;
        } catch {
          // ignore body parse error
        }
        setServerError(message);
        return;
      }

      let leadId: string | undefined;
      try {
        const data = (await res.json()) as { id?: string };
        leadId = data.id;
      } catch {
        // body parse failure is non-fatal — success is conveyed by status
      }

      setSuccess({ name: name.trim(), id: leadId });
    } catch {
      setServerError("We couldn't reach the desk. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (success) {
    return (
      <section
        className="bg-paper-dark/30 border border-rule p-6 md:p-8"
        role="status"
        aria-live="polite"
      >
        <p className="kicker">§ Reserved</p>
        <h3 className="display text-3xl md:text-4xl leading-[1.05] tracking-tight text-ink mt-3">
          Thanks, {success.name}
          <span className="display-italic text-accent">.</span>
        </h3>
        <div className="rule mt-6" />
        <p className="mt-6 text-base text-ink-soft leading-relaxed max-w-md">
          A dealer will call you within 24 hours. Keep your phone handy — in the
          meantime, feel free to explore other cars on CarFit.
        </p>
        {success.id && (
          <p className="kicker mt-6">§ Ref · {success.id}</p>
        )}
        <button
          type="button"
          onClick={resetForm}
          className="mt-6 font-mono text-[10px] uppercase tracking-kicker text-accent border-b border-accent pb-0.5 hover:text-accent-deep hover:border-accent-deep transition-colors duration-300"
        >
          Send another →
        </button>
      </section>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────
  const inputBase =
    'w-full bg-paper border border-rule px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none transition-colors duration-300';
  const errorBorder = 'border-b-accent-deep';

  return (
    <section className="bg-paper-dark/30 border border-rule p-6 md:p-8">
      {/* Heading */}
      <p className="kicker">§ Test drive</p>
      <h3 className="display text-3xl md:text-4xl leading-[1.05] tracking-tight text-ink mt-3">
        Reserve a <span className="display-italic text-accent">slot</span>.
      </h3>
      <p className="mt-3 text-base text-ink-soft leading-relaxed max-w-md">
        A dealer will reach out within 24 hours. No spam, no pressure.
      </p>
      <div className="rule mt-6" />

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="lead-name" className="kicker block">
              § Name
            </label>
            <input
              id="lead-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'lead-name-error' : undefined}
              className={`${inputBase} ${errors.name ? errorBorder : ''}`}
              placeholder="Aarav Sharma"
            />
            {errors.name && (
              <p
                id="lead-name-error"
                role="alert"
                className="font-mono text-[10px] uppercase tracking-kicker text-accent-deep"
              >
                § {errors.name}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label htmlFor="lead-phone" className="kicker block">
              § Phone
            </label>
            <input
              id="lead-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={14}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
              className={`${inputBase} ${errors.phone ? errorBorder : ''}`}
              placeholder="+91 98765 43210"
            />
            {errors.phone && (
              <p
                id="lead-phone-error"
                role="alert"
                className="font-mono text-[10px] uppercase tracking-kicker text-accent-deep"
              >
                § {errors.phone}
              </p>
            )}
          </div>
        </div>

        {/* City */}
        <div className="space-y-2">
          <label htmlFor="lead-city" className="kicker block">
            § City (optional)
          </label>
          <input
            id="lead-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputBase}
            placeholder="Bengaluru"
          />
        </div>

        {/* Intent picker */}
        <fieldset className="space-y-3">
          <legend className="kicker">§ How can we help?</legend>
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="How can we help?"
          >
            {INTENT_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt.value}
                active={intent === opt.value}
                onClick={() => setIntent(opt.value)}
              >
                {opt.label}
              </ToggleButton>
            ))}
          </div>
        </fieldset>

        {/* Server error block */}
        {serverError && (
          <div role="alert" className="border-t border-rule pt-6 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-kicker text-accent-deep">
              § Hmm
            </p>
            <p className="text-sm text-ink-soft leading-relaxed">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <div className="border-t border-rule pt-6 flex flex-col gap-4">
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="group inline-flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-kicker px-6 py-4 border border-ink bg-ink text-paper hover:bg-ink-soft transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-ink"
          >
            {submitting ? (
              <span>§ Sending …</span>
            ) : (
              <>
                <span>Reserve</span>
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </>
            )}
          </button>
          <p className="kicker">
            § By submitting, you agree to be contacted by a partner dealer.
          </p>
        </div>
      </form>
    </section>
  );
}
