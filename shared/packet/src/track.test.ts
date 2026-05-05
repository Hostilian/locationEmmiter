import { describe, expect, it } from '@jest/globals';
import { lastKnownByDevice } from './track.js';
import type { LocationEmitterPacketV1 } from './types.js';

const id = (a: number) => Uint8Array.from([a, 0, 0, 0, 0, 0, 0, 0]);

describe('lastKnownByDevice', () => {
  it('keeps newest unix_time per device', () => {
    const packets: LocationEmitterPacketV1[] = [
      { version: 1, flags: 0, unixTime: 100, latE7: 1, lonE7: 2, altM: 0, hAccuracyM: 0, batteryPct: 0, deviceId: id(1), text: '' },
      { version: 1, flags: 0, unixTime: 200, latE7: 3, lonE7: 4, altM: 0, hAccuracyM: 0, batteryPct: 0, deviceId: id(1), text: '' },
      { version: 1, flags: 0, unixTime: 150, latE7: 5, lonE7: 6, altM: 0, hAccuracyM: 0, batteryPct: 0, deviceId: id(2), text: '' },
    ];
    const out = lastKnownByDevice(packets);
    expect(out.length).toBe(2);
    const d1 = out.find((p) => p.deviceId[0] === 1)!;
    expect(d1.unixTime).toBe(200);
    expect(d1.latE7).toBe(3);
  });
});
