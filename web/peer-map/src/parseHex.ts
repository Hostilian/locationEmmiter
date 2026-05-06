/** Hex string with optional spaces (spaced bytes or one continuous run). */
export function toHexSpaced(buf: Uint8Array): string {
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');
}

/** Accepts spaces, commas, colons, newlines between hex pairs, or one continuous hex string. */
export function parseHex(s: string): Uint8Array | null {
  const raw = s.trim();
  if (!raw) return null;
  const normalized = raw.replaceAll(/0x/gi, '');
  if (/[g-z]/i.test(normalized)) {
    return null;
  }
  const hexOnly = normalized.replaceAll(/[^0-9a-fA-F]/g, '');
  if (hexOnly.length >= 2 && hexOnly.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexOnly)) {
    const out = new Uint8Array(hexOnly.length / 2);
    for (let i = 0; i < hexOnly.length; i += 2) {
      out[i / 2] = Number.parseInt(hexOnly.slice(i, i + 2), 16);
    }
    return out;
  }

  const parts = normalized.split(/[\s,:;|]+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (!parts.every((h) => /^[0-9a-fA-F]{2}$/.test(h))) {
    return null;
  }
  try {
    return Uint8Array.from(parts.map((h) => Number.parseInt(h, 16)));
  } catch {
    return null;
  }
}
