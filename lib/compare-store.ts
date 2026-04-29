// ──────────────────────────────────────────────────────────────────────────────
// Compare cart store — tiny localStorage wrapper.
//
// Persists a JSON-encoded `string[]` of car ids under STORAGE_KEY. Cross-component
// reactivity is achieved via a custom 'compare:change' window event broadcast on
// every write, plus a 'storage' listener so changes from other tabs propagate.
//
// SSR-safe: `read` returns [] when window is undefined; subscribe is a no-op
// outside the browser. Components that consume this store must still gate
// initial render with a `mounted` flag to avoid hydration drift.
// ──────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'carfit:compare';
export const MAX_ITEMS = 3;
export const EVENT_NAME = 'compare:change';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function read(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter to strings only — defensive against tampered storage.
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export function write(ids: string[]): void {
  if (!isBrowser()) return;
  // Dedup while preserving order, then cap.
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      deduped.push(id);
    }
  }
  const capped = deduped.slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // Storage may be unavailable (private mode, quota); fail silently.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: capped }));
}

export function add(id: string): boolean {
  const current = read();
  if (current.includes(id)) return false;
  if (current.length >= MAX_ITEMS) return false;
  write([...current, id]);
  return true;
}

export function remove(id: string): void {
  const current = read();
  if (!current.includes(id)) return;
  write(current.filter((x) => x !== id));
}

export function has(id: string): boolean {
  return read().includes(id);
}

export function clear(): void {
  write([]);
}

export function subscribe(cb: (ids: string[]) => void): () => void {
  if (!isBrowser()) return () => {};

  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<string[]>).detail;
    if (Array.isArray(detail)) {
      cb(detail);
    } else {
      cb(read());
    }
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cb(read());
    }
  };

  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
