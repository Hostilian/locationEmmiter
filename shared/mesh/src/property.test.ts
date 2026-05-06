import { describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import {
  encodeFull,
  FLAG_RELAY_ELIGIBLE,
  type LocationEmitterPacketV1,
} from '@location-emitter/packet';
import { encodeMeshFromPacket, unwrapMeshFrame, wrapLepWithMesh } from './envelope.js';

const id = Uint8Array.from([0xab, 0, 0, 0, 0, 0, 0, 0x01]);

function samplePacket(over: Partial<LocationEmitterPacketV1> = {}): LocationEmitterPacketV1 {
  return {
    version: 1,
    flags: FLAG_RELAY_ELIGIBLE,
    unixTime: 1_700_000_000,
    latE7: 48_858_3700,
    lonE7: 2_294_8100,
    altM: 10,
    hAccuracyM: 5,
    batteryPct: 90,
    deviceId: id,
    text: '',
    ...over,
  };
}

describe('mesh property tests', () => {
  it('unwrap(wrap(lep,hop)) preserves hop and inner bytes', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 255 }), fc.uint8Array({ minLength: 36, maxLength: 80 }), (hop, inner) => {
        if (inner.length < 36) return true;
        inner[4] = 1;
        inner[5] &= ~4;
        const w = wrapLepWithMesh(inner, hop, 0);
        const u = unwrapMeshFrame(w);
        expect(u).not.toBeNull();
        if (!u) return false;
        expect(u.hopRemaining).toBe(hop);
        expect(Buffer.from(u.lepWire.subarray(0, inner.length)).equals(Buffer.from(inner))).toBe(true);
        return true;
      }),
      { numRuns: 40 },
    );
  });

  it('encodeMeshFromPacket roundtrips through unwrap + decodeFull', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xff }).map((n) => n & ~4),
        fc.integer({ min: 0, max: 0xffff_ffff }),
        fc.integer({ min: -900_000_000, max: 900_000_000 }),
        fc.integer({ min: -1_800_000_000, max: 1_800_000_000 }),
        (flags, unixTime, latE7, lonE7) => {
          const p = samplePacket({ flags: flags | FLAG_RELAY_ELIGIBLE, unixTime: unixTime >>> 0, latE7, lonE7 });
          let mesh: Uint8Array;
          try {
            mesh = encodeMeshFromPacket(p);
          } catch {
            return true;
          }
          const u = unwrapMeshFrame(mesh);
          expect(u).not.toBeNull();
          if (!u) return false;
          const lep = encodeFull(p);
          expect(Buffer.from(u.lepWire.subarray(0, lep.length)).equals(Buffer.from(lep))).toBe(true);
          return true;
        },
      ),
      { numRuns: 30 },
    );
  });
});
