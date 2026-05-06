import { describe, expect, it } from '@jest/globals';
import {
  FLAG_ENCRYPTED,
  FLAG_RELAY_ELIGIBLE,
  FLAG_SOS,
  LEP_MAGIC,
  LEP_PREFIX_LEN,
  LEP_VERSION,
  crc16CcittFalse,
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
    expect(d.warnings).toEqual([]);
  });

  it('round-trips full with empty text', () => {
    const p = { ...sample, text: '' };
    const wire = encodeFull(p);
    expect(wire.length).toBe(36);
    const d = decodeFull(wire);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(Array.isArray(d.warnings)).toBe(true);
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

describe('decodeFull negative paths', () => {
  it('rejects buffer too small', () => {
    const d = decodeFull(new Uint8Array(LEP_PREFIX_LEN + 1));
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('too small');
  });

  it('rejects bad magic', () => {
    const buf = new Uint8Array(40);
    buf[4] = LEP_VERSION;
    buf[5] = 0;
    const d = decodeFull(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toBe('bad magic');
  });

  it('rejects unsupported version', () => {
    const buf = new Uint8Array(40);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    buf[4] = 99;
    buf[5] = 0;
    const d = decodeFull(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('unsupported version');
  });

  it('rejects encrypted flag', () => {
    const buf = new Uint8Array(40);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    buf[4] = LEP_VERSION;
    buf[5] = FLAG_ENCRYPTED;
    const d = decodeFull(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('encrypted');
  });

  it('rejects text_len out of range', () => {
    const buf = new Uint8Array(40);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    buf[4] = LEP_VERSION;
    buf[5] = 0;
    buf[25] = 33;
    const d = decodeFull(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('text_len');
  });

  it('rejects truncated packet', () => {
    const p = {
      version: 1 as const,
      flags: 0,
      unixTime: 1,
      latE7: 0,
      lonE7: 0,
      altM: 0,
      hAccuracyM: 0,
      batteryPct: 0,
      deviceId: sampleId,
      text: 'hello',
    };
    const full = encodeFull(p);
    const truncated = full.subarray(0, full.length - 1);
    const d = decodeFull(truncated);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('truncated');
  });

  it('rejects crc mismatch', () => {
    const wire = encodeFull({ ...sample, text: '' });
    wire[wire.length - 1] ^= 0xff;
    const d = decodeFull(wire);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toBe('crc mismatch');
  });
});

describe('decodeBleShort negative paths', () => {
  it('rejects buffer too small', () => {
    const d = decodeBleShort(new Uint8Array(26));
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('BLE short');
  });

  it('rejects bad magic', () => {
    const buf = new Uint8Array(27);
    buf[4] = LEP_VERSION;
    const d = decodeBleShort(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toBe('bad magic');
  });

  it('rejects unsupported version', () => {
    const buf = new Uint8Array(27);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    buf[4] = 2;
    const d = decodeBleShort(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('unsupported version');
  });

  it('rejects encrypted flag', () => {
    const buf = new Uint8Array(27);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    buf[4] = LEP_VERSION;
    buf[5] = FLAG_ENCRYPTED;
    const d = decodeBleShort(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toContain('encrypted');
  });

  it('rejects crc mismatch', () => {
    const wire = encodeBleShort({ ...sample, text: '' });
    wire[26] ^= 1;
    const d = decodeBleShort(wire);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toBe('crc mismatch');
  });
});

describe('decodeAny routing', () => {
  it('returns full-decode error for long invalid frame (no silent BLE fallback)', () => {
    const buf = new Uint8Array(50);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    buf[4] = LEP_VERSION;
    buf[5] = 0;
    buf[25] = 0;
    dv.setUint16(LEP_PREFIX_LEN, 0xdead, true);
    const d = decodeAny(buf);
    expect(d.ok).toBe(false);
    if (d.ok) return;
    expect(d.error).toBe('crc mismatch');
  });
});

describe('semantic warnings', () => {
  it('warns on zero unix time and zero lat/lon', () => {
    const body = new Uint8Array(LEP_PREFIX_LEN);
    const dv = new DataView(body.buffer);
    dv.setUint32(0, LEP_MAGIC, true);
    body[4] = LEP_VERSION;
    body[5] = 0;
    dv.setUint16(6, 0, true);
    dv.setUint32(8, 0, true);
    dv.setInt32(12, 0, true);
    dv.setInt32(16, 0, true);
    dv.setInt16(20, 0, true);
    dv.setUint16(22, 0, true);
    body[24] = 50;
    body[25] = 0;
    body.set(sampleId, 26);
    const crc = crc16CcittFalse(body);
    const wire = new Uint8Array(LEP_PREFIX_LEN + 2);
    wire.set(body);
    const dv2 = new DataView(wire.buffer);
    dv2.setUint16(LEP_PREFIX_LEN, crc, true);
    const d = decodeFull(wire);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.warnings).toContain('unix_time is zero');
    expect(d.warnings).toContain('latitude and longitude are both zero (unknown position signal)');
  });

  it('warns on reserved flag bits', () => {
    const wire = encodeFull({ ...sample, text: '', flags: 0x08 });
    const d = decodeFull(wire);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.warnings.some((w) => w.includes('reserved flag'))).toBe(true);
  });
});
