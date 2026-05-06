import { describe, expect, it } from '@jest/globals';
import {
  encodeFull,
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
  type LocationEmitterPacketV1,
} from '@location-emitter/packet';
import { encodeMeshFromPacket, wrapLepWithMesh } from './envelope.js';
import { RelayEngine, suggestRelayForwardJitterMs } from './relay.js';

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

describe('RelayEngine', () => {
  it('delivers and forwards with decremented hop', () => {
    const now = 1_000_000;
    const eng = new RelayEngine(() => now);
    const mesh = encodeMeshFromPacket(samplePacket());
    const r = eng.processReceivedMeshFrame(mesh);
    expect(r.delivered).not.toBeNull();
    expect(r.forwardWire).not.toBeNull();
    const inner = unwrapSafe(r.forwardWire!);
    expect(inner.hop).toBe(2);
  });

  it('does not forward when relay_eligible clear', () => {
    const eng = new RelayEngine(() => 1_000_000);
    const p = samplePacket({ flags: 0 });
    const mesh = encodeMeshFromPacket(p);
    const r = eng.processReceivedMeshFrame(mesh);
    expect(r.delivered).not.toBeNull();
    expect(r.forwardWire).toBeNull();
  });

  it('dedupes identical LEP within TTL', () => {
    const eng = new RelayEngine(() => 1_000_000);
    const mesh = encodeMeshFromPacket(samplePacket());
    expect(eng.processReceivedMeshFrame(mesh).dropReason).toBeUndefined();
    const r2 = eng.processReceivedMeshFrame(mesh);
    expect(r2.dropReason).toBe('deduped');
    expect(r2.delivered).toBeNull();
  });

  it('rate-limits forwards per device', () => {
    let now = 1_000_000;
    const eng = new RelayEngine(() => now);
    const mesh = encodeMeshFromPacket(samplePacket());
    eng.processReceivedMeshFrame(mesh);
    now += 5000;
    const p2 = samplePacket({ unixTime: 1_700_000_030 });
    const lep2 = encodeFull(p2);
    const mesh2 = wrapLepWithMesh(lep2, 3, 0);
    const r2 = eng.processReceivedMeshFrame(mesh2);
    expect(r2.delivered).not.toBeNull();
    expect(r2.dropReason).toBe('rate_limited');
    expect(r2.forwardWire).toBeNull();
  });

  it('uses extra hop for SOS source frames', () => {
    const mesh = encodeMeshFromPacket(samplePacket({ flags: FLAG_SOS | FLAG_RELAY_ELIGIBLE }));
    expect(mesh[4]).toBe(4);
  });

  it('bounds lastRelayOut map size across many devices', () => {
    let now = 2_000_000;
    const eng = new RelayEngine(() => now);
    for (let i = 0; i < 4200; i++) {
      const id = new Uint8Array(8);
      id[0] = i & 0xff;
      id[1] = (i >> 8) & 0xff;
      id[2] = (i >> 16) & 0xff;
      id[3] = (i >> 24) & 0xff;
      id[7] = 1;
      const p = samplePacket({ deviceId: id, unixTime: 1_700_000_000 + i });
      const mesh = encodeMeshFromPacket(p);
      eng.processReceivedMeshFrame(mesh);
      now += 1;
    }
    const relayMap = (eng as unknown as { lastRelayOut: Map<string, number> }).lastRelayOut;
    expect(relayMap.size).toBeLessThanOrEqual(4096);
  });

  it('suggestRelayForwardJitterMs stays in range', () => {
    for (let s = 0; s < 5000; s++) {
      const j = suggestRelayForwardJitterMs(s);
      expect(j).toBeGreaterThanOrEqual(20);
      expect(j).toBeLessThanOrEqual(500);
    }
  });
});

function unwrapSafe(buf: Uint8Array): { hop: number } {
  expect(buf.length).toBeGreaterThan(6);
  return { hop: buf[4]! };
}
