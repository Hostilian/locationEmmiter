import { describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { decodeAny, decodeBleShort, decodeFull, encodeBleShort, encodeFull } from './index.js';
import type { LocationEmitterPacketV1 } from './types.js';

const deviceIdArb = fc.uint8Array({ minLength: 8, maxLength: 8 });

const packetArb: fc.Arbitrary<LocationEmitterPacketV1> = fc.record({
  version: fc.constant(1 as const),
  flags: fc.integer({ min: 0, max: 0xff }).map((n) => (n & ~4) | 0), // clear encrypted bit for v1 encoder
  unixTime: fc.integer({ min: 0, max: 0xffff_ffff }),
  latE7: fc.integer({ min: -900_000_000, max: 900_000_000 }),
  lonE7: fc.integer({ min: -1_800_000_000, max: 1_800_000_000 }),
  altM: fc.integer({ min: -32768, max: 32767 }),
  hAccuracyM: fc.integer({ min: 0, max: 65535 }),
  batteryPct: fc.integer({ min: 0, max: 255 }),
  deviceId: deviceIdArb,
  text: fc.uint8Array({ maxLength: 32 }).map((u) => new TextDecoder('utf-8', { fatal: false }).decode(u)),
});

describe('property tests', () => {
  it('full encode/decode roundtrip', () => {
    fc.assert(
      fc.property(packetArb, (p) => {
        let wire: Uint8Array;
        try {
          wire = encodeFull(p);
        } catch {
          return true;
        }
        const d = decodeFull(wire);
        expect(d.ok).toBe(true);
        if (!d.ok) return false;
        expect(d.packet.version).toBe(1);
        expect(d.packet.flags).toBe(p.flags & ~4);
        expect(d.packet.unixTime).toBe(p.unixTime >>> 0);
        expect(d.packet.latE7).toBe(p.latE7);
        expect(d.packet.lonE7).toBe(p.lonE7);
        expect(d.packet.text).toBe(p.text);
        expect(Buffer.from(d.packet.deviceId).equals(Buffer.from(p.deviceId))).toBe(true);
        return true;
      }),
      { numRuns: 50 },
    );
  });

  it('BLE short encode/decode roundtrip', () => {
    fc.assert(
      fc.property(packetArb, (p) => {
        let wire: Uint8Array;
        try {
          wire = encodeBleShort(p);
        } catch {
          return true;
        }
        const d = decodeBleShort(wire);
        expect(d.ok).toBe(true);
        if (!d.ok) return false;
        expect(d.packet.latE7).toBe(p.latE7);
        expect(d.packet.lonE7).toBe(p.lonE7);
        expect(d.packet.deviceId.subarray(0, 4)).toEqual(p.deviceId.subarray(0, 4));
        return true;
      }),
      { numRuns: 40 },
    );
  });

  it('decodeAny never throws on random buffers', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 120 }), (buf) => {
        expect(() => decodeAny(buf)).not.toThrow();
        const r = decodeAny(buf);
        if (r.ok) {
          expect(Array.isArray(r.warnings)).toBe(true);
        } else {
          expect(typeof r.error).toBe('string');
        }
        return true;
      }),
      { numRuns: 200 },
    );
  });

  it('rejects full packet with trailing bytes', () => {
    fc.assert(
      fc.property(packetArb, (p) => {
        let wire: Uint8Array;
        try {
          wire = encodeFull(p);
        } catch {
          return true;
        }
        const withTrailing = new Uint8Array(wire.length + 1);
        withTrailing.set(wire, 0);
        withTrailing[withTrailing.length - 1] = 0xaa;
        const d = decodeFull(withTrailing);
        expect(d.ok).toBe(false);
        if (!d.ok) {
          expect(d.error).toBe('unexpected trailing bytes');
        }
        return true;
      }),
      { numRuns: 30 },
    );
  });
});
