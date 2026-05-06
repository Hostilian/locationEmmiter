import { describe, expect, it } from 'vitest';
import { parseHex, toHexSpaced } from './parseHex.js';

describe('parseHex', () => {
  it('parses continuous hex', () => {
    const b = parseHex('4c47454f01');
    expect(b).not.toBeNull();
    expect(b!.length).toBe(5);
  });

  it('parses spaced pairs', () => {
    const b = parseHex('4c 47 45 4f 01');
    expect(b).not.toBeNull();
    expect(b!.length).toBe(5);
  });

  it('parses comma and colon delimiters', () => {
    const b = parseHex('4c,47:45;4f|01');
    expect(b).not.toBeNull();
    expect([...b!]).toEqual([0x4c, 0x47, 0x45, 0x4f, 0x01]);
  });

  it('returns null for empty', () => {
    expect(parseHex('   ')).toBeNull();
  });

  it('rejects odd length compact hex', () => {
    expect(parseHex('4c47454')).toBeNull();
  });

  it('rejects non-hex tokens in delimited input', () => {
    expect(parseHex('4c 47 zz 01')).toBeNull();
  });

  it('rejects token with one nibble', () => {
    expect(parseHex('4c 7 45')).toBeNull();
  });

  it('rejects mixed valid and invalid delimiter tokens', () => {
    expect(parseHex('4c,47:xx;01')).toBeNull();
  });
});

describe('toHexSpaced', () => {
  it('formats bytes', () => {
    expect(toHexSpaced(new Uint8Array([0x4c, 0x47]))).toBe('4c 47');
  });
});
