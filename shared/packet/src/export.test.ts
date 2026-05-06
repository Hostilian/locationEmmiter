import { describe, expect, it } from '@jest/globals';
import { FLAG_RELAY_ELIGIBLE, FLAG_SOS, packetsToCsv, packetsToGpx } from './index.js';
import type { LocationEmitterPacketV1 } from './types.js';

const p: LocationEmitterPacketV1 = {
  version: 1,
  flags: FLAG_SOS | FLAG_RELAY_ELIGIBLE,
  unixTime: 1700000000,
  latE7: 48_858_3700,
  lonE7: 2_294_8100,
  altM: 35,
  hAccuracyM: 12,
  batteryPct: 87,
  deviceId: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]),
  text: 'help',
};

describe('export', () => {
  it('builds GPX with waypoint', () => {
    const gpx = packetsToGpx([p], 'test-track');
    expect(gpx).toContain('<gpx ');
    expect(gpx).toContain('<metadata>');
    expect(gpx).toContain('1 waypoint(s), 1 device ID(s), 1 SOS');
    expect(gpx).toContain('creator="location-emitter/LEP-v1"');
    expect(gpx).toContain('<wpt lat="48.85837" lon="2.29481"');
    expect(gpx).toContain('0102030405060708-SOS</name>');
  });

  it('builds CSV rows', () => {
    const csv = packetsToCsv([p]);
    expect(csv.split('\n').length).toBe(3);
    expect(csv).toContain('0102030405060708');
    expect(csv).toContain(',1,1,');
  });
});
