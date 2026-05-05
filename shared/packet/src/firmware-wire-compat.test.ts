import { describe, expect, it } from '@jest/globals';
import {
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
  decodeBleShort,
  decodeFull,
  encodeBleShort,
  encodeFull,
} from './index.js';

/**
 * Golden wire hex must match firmware `lep_encode_full` / `lep_encode_ble_short`
 * (see `firmware/esp32-lora/include/lep_v1.h`). If these fail after an intentional
 * format change, update firmware and spec together.
 */
describe('LEP v1 wire format (firmware-aligned golden vectors)', () => {
  const id = Uint8Array.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  it('full packet, empty text', () => {
    const golden =
      '4c47454f0102000000f1536514321f1d04295e0123000c00570001020304050607082aee';
    const p = {
      version: 1 as const,
      flags: FLAG_RELAY_ELIGIBLE,
      unixTime: 1700000000,
      latE7: 488_583_700,
      lonE7: 22_948_100,
      altM: 35,
      hAccuracyM: 12,
      batteryPct: 87,
      deviceId: id,
      text: '',
    };
    expect(Buffer.from(encodeFull(p)).toString('hex')).toBe(golden);
    const d = decodeFull(Uint8Array.from(Buffer.from(golden, 'hex')));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.packet.unixTime).toBe(1700000000);
    expect(d.packet.latE7).toBe(488_583_700);
    expect(d.packet.text).toBe('');
  });

  it('BLE short, relay eligible', () => {
    const golden = '4c47454f0102000000f1536514321f1d04295e0157010203043d5e';
    const p = {
      version: 1 as const,
      flags: FLAG_RELAY_ELIGIBLE,
      unixTime: 1700000000,
      latE7: 488_583_700,
      lonE7: 22_948_100,
      altM: 35,
      hAccuracyM: 12,
      batteryPct: 87,
      deviceId: id,
      text: '',
    };
    expect(Buffer.from(encodeBleShort(p)).toString('hex')).toBe(golden);
    const d = decodeBleShort(Uint8Array.from(Buffer.from(golden, 'hex')));
    expect(d.ok).toBe(true);
  });

  it('full packet, SOS + text', () => {
    const golden =
      '4c47454f0103000000f1536514321f1d04295e0123000c0057030102030405060708534f533e7e';
    const p = {
      version: 1 as const,
      flags: FLAG_SOS | FLAG_RELAY_ELIGIBLE,
      unixTime: 1700000000,
      latE7: 488_583_700,
      lonE7: 22_948_100,
      altM: 35,
      hAccuracyM: 12,
      batteryPct: 87,
      deviceId: id,
      text: 'SOS',
    };
    expect(Buffer.from(encodeFull(p)).toString('hex')).toBe(golden);
    const d = decodeFull(Uint8Array.from(Buffer.from(golden, 'hex')));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.packet.flags).toBe(FLAG_SOS | FLAG_RELAY_ELIGIBLE);
    expect(d.packet.text).toBe('SOS');
  });

  it('full packet, negative lat / signed fields', () => {
    const golden =
      '4c47454f0102000001000000209419ec90a9205af6ffffffff01ab0000000000000178436d';
    const id2 = Uint8Array.from([0xab, 0, 0, 0, 0, 0, 0, 0x01]);
    const p = {
      version: 1 as const,
      flags: FLAG_RELAY_ELIGIBLE,
      unixTime: 1,
      latE7: -333_868_000,
      lonE7: 1_512_090_000,
      altM: -10,
      hAccuracyM: 65535,
      batteryPct: 255,
      deviceId: id2,
      text: 'x',
    };
    expect(Buffer.from(encodeFull(p)).toString('hex')).toBe(golden);
    const d = decodeFull(Uint8Array.from(Buffer.from(golden, 'hex')));
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.packet.latE7).toBe(-333_868_000);
    expect(d.packet.altM).toBe(-10);
    expect(d.packet.hAccuracyM).toBe(65535);
    expect(d.packet.text).toBe('x');
  });
});
