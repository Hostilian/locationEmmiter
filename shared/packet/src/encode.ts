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

function writeU16LE(dv: DataView, o: number, v: number) {
  dv.setUint16(o, v, true);
}

function writeU32LE(dv: DataView, o: number, v: number) {
  dv.setUint32(o, v, true);
}

function writeI32LE(dv: DataView, o: number, v: number) {
  dv.setInt32(o, v, true);
}

function writeI16LE(dv: DataView, o: number, v: number) {
  dv.setInt16(o, v, true);
}

/** Full v1 packet: variable length 36 + (0..32) for text */
export function encodeFull(p: LocationEmitterPacketV1): Uint8Array {
  if (p.deviceId.length !== 8) throw new Error('deviceId must be 8 bytes');
  const te = new TextEncoder();
  const textBytes = te.encode(p.text);
  if (textBytes.length > LEP_TEXT_MAX) {
    throw new Error(`text exceeds ${LEP_TEXT_MAX} UTF-8 bytes`);
  }
  const n = LEP_PREFIX_LEN + textBytes.length + 2;
  const buf = new Uint8Array(n);
  const dv = new DataView(buf.buffer);

  writeU32LE(dv, 0, LEP_MAGIC);
  buf[4] = LEP_VERSION;
  buf[5] = p.flags & ~FLAG_ENCRYPTED; // v1: encrypted bit must be 0
  writeU16LE(dv, 6, 0);
  writeU32LE(dv, 8, p.unixTime >>> 0);
  writeI32LE(dv, 12, p.latE7 | 0);
  writeI32LE(dv, 16, p.lonE7 | 0);
  writeI16LE(dv, 20, p.altM | 0);
  writeU16LE(dv, 22, Math.min(65535, Math.max(0, p.hAccuracyM | 0)));
  buf[24] = p.batteryPct & 0xff;
  buf[25] = textBytes.length;
  buf.set(p.deviceId, 26);
  buf.set(textBytes, 34);

  const crc = crc16CcittFalse(buf.subarray(0, LEP_PREFIX_LEN + textBytes.length));
  writeU16LE(dv, LEP_PREFIX_LEN + textBytes.length, crc);
  return buf;
}

/** BLE manufacturer payload (27 B), no altitude/text in-band */
export function encodeBleShort(p: LocationEmitterPacketV1): Uint8Array {
  if (p.deviceId.length !== 8) throw new Error('deviceId must be 8 bytes');
  const buf = new Uint8Array(LEP_BLE_SHORT_LEN);
  const dv = new DataView(buf.buffer);

  writeU32LE(dv, 0, LEP_MAGIC);
  buf[4] = LEP_VERSION;
  buf[5] = p.flags & ~FLAG_ENCRYPTED;
  writeU16LE(dv, 6, 0);
  writeU32LE(dv, 8, p.unixTime >>> 0);
  writeI32LE(dv, 12, p.latE7 | 0);
  writeI32LE(dv, 16, p.lonE7 | 0);
  buf[20] = p.batteryPct & 0xff;
  buf.set(p.deviceId.subarray(0, 4), 21);

  const crc = crc16CcittFalse(buf.subarray(0, 25));
  writeU16LE(dv, 25, crc);
  return buf;
}
