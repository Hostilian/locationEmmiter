import { crc16CcittFalse } from './crc16.js';
import {
  FLAG_ENCRYPTED,
  LEP_BLE_SHORT_LEN,
  LEP_MAGIC,
  LEP_PREFIX_LEN,
  LEP_TEXT_MAX,
  LEP_VERSION,
} from './constants.js';
import type { LocationEmitterPacketV1 } from './types.js';

function readU16LE(dv: DataView, o: number) {
  return dv.getUint16(o, true);
}

function readU32LE(dv: DataView, o: number) {
  return dv.getUint32(o, true);
}

function readI32LE(dv: DataView, o: number) {
  return dv.getInt32(o, true);
}

function readI16LE(dv: DataView, o: number) {
  return dv.getInt16(o, true);
}

export type DecodeResult =
  | { ok: true; packet: LocationEmitterPacketV1; wire: 'full' | 'ble_short' }
  | { ok: false; error: string };

export function decodeFull(buf: Uint8Array): DecodeResult {
  if (buf.length < LEP_PREFIX_LEN + 2) {
    return { ok: false, error: 'buffer too small for full packet' };
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = readU32LE(dv, 0);
  if (magic !== LEP_MAGIC) return { ok: false, error: 'bad magic' };
  const version = buf[4];
  if (version !== LEP_VERSION) return { ok: false, error: `unsupported version ${version}` };
  const flags = buf[5]!;
  if (flags & FLAG_ENCRYPTED) return { ok: false, error: 'encrypted flag set (not implemented)' };

  const textLen = buf[25]!;
  if (textLen > LEP_TEXT_MAX) return { ok: false, error: 'text_len out of range' };
  const expect = LEP_PREFIX_LEN + textLen + 2;
  if (buf.length < expect) return { ok: false, error: 'truncated packet' };

  const body = buf.subarray(0, LEP_PREFIX_LEN + textLen);
  const crcWant = readU16LE(dv, LEP_PREFIX_LEN + textLen);
  const crcGot = crc16CcittFalse(body);
  if (crcWant !== crcGot) return { ok: false, error: 'crc mismatch' };

  const deviceId = buf.subarray(26, 34);
  const textBytes = buf.subarray(34, 34 + textLen);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(textBytes);

  const packet: LocationEmitterPacketV1 = {
    version: 1,
    flags,
    unixTime: readU32LE(dv, 8),
    latE7: readI32LE(dv, 12),
    lonE7: readI32LE(dv, 16),
    altM: readI16LE(dv, 20),
    hAccuracyM: readU16LE(dv, 22),
    batteryPct: buf[24]!,
    deviceId: Uint8Array.from(deviceId),
    text,
  };
  return { ok: true, packet, wire: 'full' };
}

export function decodeBleShort(buf: Uint8Array): DecodeResult {
  if (buf.length < LEP_BLE_SHORT_LEN) {
    return { ok: false, error: 'buffer too small for BLE short' };
  }
  const slice = buf.subarray(0, LEP_BLE_SHORT_LEN);
  const dv = new DataView(slice.buffer, slice.byteOffset, slice.byteLength);
  const magic = readU32LE(dv, 0);
  if (magic !== LEP_MAGIC) return { ok: false, error: 'bad magic' };
  const version = slice[4];
  if (version !== LEP_VERSION) return { ok: false, error: `unsupported version ${version}` };
  const flags = slice[5]!;
  if (flags & FLAG_ENCRYPTED) return { ok: false, error: 'encrypted flag set (not implemented)' };

  const body = slice.subarray(0, 25);
  const crcWant = readU16LE(dv, 25);
  if (crcWant !== crc16CcittFalse(body)) return { ok: false, error: 'crc mismatch' };

  const dev = new Uint8Array(8);
  dev.set(slice.subarray(21, 25), 0);

  const packet: LocationEmitterPacketV1 = {
    version: 1,
    flags,
    unixTime: readU32LE(dv, 8),
    latE7: readI32LE(dv, 12),
    lonE7: readI32LE(dv, 16),
    altM: 0,
    hAccuracyM: 0,
    batteryPct: slice[20]!,
    deviceId: dev,
    text: '',
  };
  return { ok: true, packet, wire: 'ble_short' };
}

const MIN_FULL = LEP_PREFIX_LEN + 2; // text_len == 0

/**
 * Decode full packet when `buf.length >= 36`; otherwise try BLE short (27 B).
 * If a long buffer fails full decode, the error is returned (no BLE fallback on long frames).
 */
export function decodeAny(buf: Uint8Array): DecodeResult {
  if (buf.length >= MIN_FULL) return decodeFull(buf);
  return decodeBleShort(buf);
}
