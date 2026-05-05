#!/usr/bin/env node
/**
 * Decode hex dump to JSON. Supports raw LEP (full/BLE short) or mesh-wrapped LoRa (LRM1 + LEP).
 *
 * Usage:
 *   node tools/decode-packet.mjs 4C 47 45 4F ...
 *   node tools/decode-packet.mjs 4c47454f0102...
 *   echo 4c47454f0102000000... | node tools/decode-packet.mjs
 *
 * Hex may be space/comma/newline-separated or one continuous run; optional 0x prefixes stripped.
 * Requires: npm run build (packet + mesh)
 */
import fs from 'node:fs';
import { decodeAny, decodeFull } from '../shared/packet/dist/index.js';
import { unwrapMeshFrame } from '../shared/mesh/dist/index.js';

function parseHexBytes(source) {
  const hex = source.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  if (hex.length === 0) {
    return null;
  }
  if (hex.length % 2 !== 0) {
    return { error: 'odd number of hex digits (check input)' };
  }
  return Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));
}

function readInput() {
  if (process.argv.length > 2) {
    return process.argv.slice(2).join(' ');
  }
  if (process.stdin.isTTY) {
    return '';
  }
  return fs.readFileSync(0, 'utf8');
}

const text = readInput();
const buf = parseHexBytes(text);
if (buf === null || (typeof buf === 'object' && 'error' in buf)) {
  console.error(
    buf && typeof buf === 'object' && 'error' in buf
      ? buf.error
      : 'Usage: node tools/decode-packet.mjs <hex bytes…>   or pipe / redirect hex on stdin',
  );
  process.exit(1);
}

function packetJson(p) {
  return {
    ...p,
    deviceId: Buffer.from(p.deviceId).toString('hex'),
    lat: p.latE7 / 1e7,
    lon: p.lonE7 / 1e7,
  };
}

if (buf.length >= 6 && buf[0] === 0x4c && buf[1] === 0x52 && buf[2] === 0x4d && buf[3] === 0x31) {
  const u = unwrapMeshFrame(buf);
  if (!u) {
    console.error('Invalid mesh frame');
    process.exit(2);
  }
  const d = decodeFull(u.lepWire);
  console.log(
    JSON.stringify(
      { transport: 'mesh', hopRemaining: u.hopRemaining, lep: d.ok ? packetJson(d.packet) : d },
      null,
      2,
    ),
  );
  process.exit(d.ok ? 0 : 3);
}

const d = decodeAny(buf);
console.log(
  JSON.stringify(
    { transport: 'lep', decode: d.ok ? packetJson(d.packet) : d, wire: d.ok ? d.wire : undefined },
    null,
    2,
  ),
);
process.exit(d.ok ? 0 : 3);
