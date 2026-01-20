// src/core/lib/primitives.ts
export function isUuidLike(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-fA-F-]{10,}$/.test(s);
}

export function isEmailLike(s: unknown): s is string {
  return typeof s === 'string' && /.+@.+\..+/.test(s);
}

export function safeArray<T = string>(v: unknown, pred?: (x: unknown) => boolean): T[] {
  const arr = Array.isArray(v) ? v : [];
  return pred ? (arr.filter(pred) as T[]) : (arr as T[]);
}

export function toUrlOrNull(v: unknown): string | null | undefined {
  if (v == null) return v as null | undefined;
  if (typeof v !== 'string' || v.trim() === '') return null;
  try {
    new URL(v);
    return v;
  } catch {
    return null;
  }
}
