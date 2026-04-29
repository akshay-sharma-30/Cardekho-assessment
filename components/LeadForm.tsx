'use client';

import { useState, type FormEvent } from 'react';

interface Props {
  carId: string;
  personaId?: string;
}

type Intent = 'test_drive' | 'callback' | 'dealer_contact';

const INTENT_OPTIONS: { value: Intent; label: string; hint: string }[] = [
  { value: 'test_drive', label: 'Book a test drive', hint: 'A dealer near you brings the car over.' },
  { value: 'callback', label: 'Request a callback', hint: 'A specialist walks you through the spec.' },
  { value: 'dealer_contact', label: 'Get dealer details', hint: 'Connect directly with the nearest showroom.' },
];

const PHONE_RE = /^[6-9]\d{9}$/;

interface FieldErrors {
  name?: string;
  phone?: string;
  city?: string;
}

export default function LeadForm({ carId, personaId }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [intent, setIntent] = useState<Intent>('test_drive');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (name.trim().length < 2) {
      next.name = 'Please enter your full name (at least 2 characters).';
    }
    if (!PHONE_RE.test(phone.trim())) {
      next.phone = 'Enter a valid 10-digit Indian mobile number.';
    }
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          personaId: personaId ?? null,
          intent,
          name: name.trim(),
          phone: phone.trim(),
          city: city.trim() || null,
        }),
      });

      if (!res.ok) {
        let message = 'Something went wrong. Please try again.';
        try {
          const data = (await res.json()) as { error?: string; errors?: Record<string, string> };
          if (data.error) message = data.error;
          else if (data.errors) message = Object.values(data.errors).join(' ');
        } catch {
          // ignore body parse error
        }
        setServerError(message);
        return;
      }

      setSuccess(name.trim());
      setName('');
      setPhone('');
      setCity('');
      setIntent('test_drive');
      setErrors({});
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white text-lg">
            ✓
          </div>
          <div>
            <h3 className="font-semibold text-lg text-emerald-900">
              Thanks {success} — a dealer will call you within 24h
            </h3>
            <p className="mt-1 text-sm text-emerald-800/80">
              Keep your phone handy. In the meantime, feel free to explore other cars on CarFit.
            </p>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="mt-4 text-sm font-medium text-emerald-900 underline-offset-4 hover:underline"
            >
              Submit another enquiry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-black/5 bg-white p-6 sm:p-8 shadow-sm space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lead-name" className="block text-sm font-medium text-ink">
            Your name
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
            className={`mt-1 w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent/60 ${
              errors.name ? 'border-red-400' : 'border-black/10'
            }`}
            placeholder="e.g. Aarav Sharma"
          />
          {errors.name && (
            <p id="lead-name-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lead-phone" className="block text-sm font-medium text-ink">
            Mobile number
          </label>
          <input
            id="lead-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
            className={`mt-1 w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent/60 ${
              errors.phone ? 'border-red-400' : 'border-black/10'
            }`}
            placeholder="10-digit mobile"
          />
          {errors.phone && (
            <p id="lead-phone-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="lead-city" className="block text-sm font-medium text-ink">
          City <span className="text-ink-muted font-normal">(optional)</span>
        </label>
        <input
          id="lead-city"
          name="city"
          type="text"
          autoComplete="address-level2"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent/30 focus:border-accent/60"
          placeholder="e.g. Bengaluru"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-ink">What would you like?</legend>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INTENT_OPTIONS.map((opt) => {
            const checked = intent === opt.value;
            return (
              <label
                key={opt.value}
                htmlFor={`lead-intent-${opt.value}`}
                className={`flex flex-col cursor-pointer rounded-xl border px-4 py-3 transition ${
                  checked
                    ? 'border-accent bg-accent-soft/50 ring-1 ring-accent'
                    : 'border-black/10 bg-white hover:border-black/20'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    id={`lead-intent-${opt.value}`}
                    type="radio"
                    name="intent"
                    value={opt.value}
                    checked={checked}
                    onChange={() => setIntent(opt.value)}
                    className="h-4 w-4 accent-accent"
                  />
                  <span className="text-sm font-medium text-ink">{opt.label}</span>
                </span>
                <span className="mt-1 text-xs text-ink-muted">{opt.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {serverError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <p className="text-xs text-ink-muted">
          By submitting, you agree to be contacted by a partner dealer about this car.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting && (
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          )}
          {submitting ? 'Sending…' : 'Book my test drive'}
        </button>
      </div>
    </form>
  );
}
