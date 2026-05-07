#!/usr/bin/env node
/**
 * Export LEP packets from a hex dump file to GPX, CSV, or GeoJSON.
 *
 * Usage:
 *   node tools/export-packets.mjs --file dump.txt --format gpx > output.gpx
 *   node tools/export-packets.mjs --file dump.txt --format csv > output.csv
 *   node tools/export-packets.mjs --file dump.txt --format geojson > output.json
 */
import fs from 'node:fs';
import { decodeAny } from '../shared/packet/dist/index.js';
import { packetsToGpx, packetsToCsv, packetsToGeoJsonText } from '../shared/packet/dist/index.js';

function parseHexBytes(source) {
  const normalized = source.replace(/0x/gi, '');
  const hex = normalized.replace(/[^0-9a-fA-F]/g, '');
  if (hex.length === 0 || hex.length % 2 !== 0) return null;
  return Uint8Array.from(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));
}

function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const formatIdx = args.indexOf('--format');

  if (fileIdx === -1 || formatIdx === -1 || !args[fileIdx + 1] || !args[formatIdx + 1]) {
    console.error('Usage: node tools/export-packets.mjs --file <path> --format <gpx|csv|geojson>');
    process.exit(1);
  }

  const filePath = args[fileIdx + 1];
  const format = args[formatIdx + 1].toLowerCase();

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  const packets = [];

  for (const line of lines) {
    const buf = parseHexBytes(line);
    if (!buf) continue;

    const d = decodeAny(buf);
    if (d.ok) {
      packets.push(d.packet);
    }
  }

  if (packets.length === 0) {
    console.error('No valid LEP packets found in file.');
    process.exit(1);
  }

  switch (format) {
    case 'gpx':
      process.stdout.write(packetsToGpx(packets));
      break;
    case 'csv':
      process.stdout.write(packetsToCsv(packets));
      break;
    case 'geojson':
      process.stdout.write(packetsToGeoJsonText(packets, 2));
      break;
    default:
      console.error(`Unknown format: ${format}`);
      process.exit(1);
  }
}

main();
