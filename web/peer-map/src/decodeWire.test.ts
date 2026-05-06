import { describe, expect, it } from 'vitest';
import { encodeFull } from '@location-emitter/packet';
import { encodeMeshFromPacket } from '@location-emitter/mesh';
import { decodeWireDetailed } from './decodeWire.js';

describe('decodeWireDetailed', () => {
  const samplePacket = {
    version: 1 as const,
    flags: 0,
    unixTime: 1_700_000_000,
    latE7: 488_583_700,
    lonE7: 22_948_100,
    altM: 35,
    hAccuracyM: 12,
    batteryPct: 87,
    deviceId: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]),
    text: 'ok',
  };

  it('decodes raw LEP full frame', () => {
    const wire = encodeFull(samplePacket);
    const d = decodeWireDetailed(wire);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.label).toBe('full');
      expect(d.packet.latE7).toBe(samplePacket.latE7);
    }
  });

  it('decodes mesh-wrapped LEP frame', () => {
    const mesh = encodeMeshFromPacket(samplePacket);
    const d = decodeWireDetailed(mesh);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.label).toMatch(/^mesh hop=/);
      expect(d.packet.lonE7).toBe(samplePacket.lonE7);
    }
  });

  it('returns reason for malformed mesh wrapper', () => {
    const bad = Uint8Array.from([0x4c, 0x52, 0x4d, 0x31, 0x00]);
    const d = decodeWireDetailed(bad);
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.reason).toMatch(/mesh|buffer too small|malformed/i);
    }
  });

  it('returns reason for invalid non-mesh payload', () => {
    const d = decodeWireDetailed(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]));
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(typeof d.reason).toBe('string');
      expect(d.reason.length).toBeGreaterThan(0);
    }
  });

  it('returns explicit reason for empty payload', () => {
    const d = decodeWireDetailed(new Uint8Array());
    expect(d.ok).toBe(false);
    if (!d.ok) {
      expect(d.reason).toBe('empty payload');
    }
  });
});
