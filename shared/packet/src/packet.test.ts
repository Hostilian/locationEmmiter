import { describe, expect, it } from '@jest/globals';
import {
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
  encodeBleShort,
  encodeFull,
  decodeAny,
  decodeBleShort,
  decodeFull,
} from './index.js';

const sampleId = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);

const sample: import('./types.js').LocationEmitterPacketV1 = {
  version: 1,
  flags: FLAG_SOS | FLAG_RELAY_ELIGIBLE,
  unixTime: 1700000000,
  latE7: 48_858_3700,
  lonE7: 2_294_8100,
  altM: 35,
  hAccuracyM: 12,
  batteryPct: 87,
  deviceId: sampleId,
  text: 'SOS',
};

describe('packet v1', () => {
  it('round-trips full with text', () => {
    const wire = encodeFull(sample);
    const d = decodeFull(wire);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.packet.text).toBe('SOS');
    expect(d.packet.latE7).toBe(sample.latE7);
    expect(d.packet.flags).toBe(sample.flags);
  });

  it('round-trips full with empty text', () => {
    const p = { ...sample, text: '' };
    const wire = encodeFull(p);
    expect(wire.length).toBe(36);
    const d = decodeFull(wire);
    expect(d.ok).toBe(true);
  });

  it('round-trips BLE short', () => {
    const wire = encodeBleShort(sample);
    expect(wire.length).toBe(27);
    const d = decodeBleShort(wire);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.packet.latE7).toBe(sample.latE7);
    expect(d.packet.lonE7).toBe(sample.lonE7);
    expect(d.packet.deviceId.subarray(0, 4)).toEqual(sampleId.subarray(0, 4));
  });

  it('decodeAny prefers valid full', () => {
    const wire = encodeFull({ ...sample, text: '' });
    const a = decodeAny(wire);
    expect(a.ok && a.wire).toBe('full');
  });
});
