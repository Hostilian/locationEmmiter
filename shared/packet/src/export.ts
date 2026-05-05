import { FLAG_RELAY_ELIGIBLE, FLAG_SOS } from './constants.js';
import type { LocationEmitterPacketV1 } from './types.js';

function hex8(id: Uint8Array): string {
  return [...id].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isoUtc(unix: number): string {
  if (!unix) return '';
  return new Date(unix * 1000).toISOString();
}

/** GPX 1.1 document with one waypoint per packet (oldest → newest). */
export function packetsToGpx(packets: LocationEmitterPacketV1[], trackName = 'location-emitter'): string {
  const wpts = packets.map((p) => {
    const lat = p.latE7 / 1e7;
    const lon = p.lonE7 / 1e7;
    const sos = (p.flags & FLAG_SOS) !== 0;
    const name = `${hex8(p.deviceId)}${sos ? '-SOS' : ''}`;
    const time = isoUtc(p.unixTime);
    const ele = p.altM !== 0 ? `\n    <ele>${p.altM}</ele>` : '';
    const timeEl = time ? `\n    <time>${time}</time>` : '';
    const desc = p.text ? `\n    <desc>${escapeXml(p.text)}</desc>` : '';
    return `  <wpt lat="${lat}" lon="${lon}">\n    <name>${escapeXml(name)}</name>${ele}${timeEl}${desc}\n  </wpt>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="location-emitter" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>${escapeXml(trackName)}</name></trk>
${wpts.join('\n')}
</gpx>
`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function packetsToCsv(packets: LocationEmitterPacketV1[]): string {
  const header =
    'unix_time,iso_time,lat,lon,alt_m,h_accuracy_m,battery_pct,sos,relay_eligible,device_id_hex,text';
  const rows = packets.map((p) => {
    const lat = p.latE7 / 1e7;
    const lon = p.lonE7 / 1e7;
    const sos = (p.flags & FLAG_SOS) !== 0 ? 1 : 0;
    const rel = (p.flags & FLAG_RELAY_ELIGIBLE) !== 0 ? 1 : 0;
    const text = csvEscape(p.text);
    return [
      p.unixTime,
      isoUtc(p.unixTime),
      lat,
      lon,
      p.altM,
      p.hAccuracyM,
      p.batteryPct,
      sos,
      rel,
      hex8(p.deviceId),
      text,
    ].join(',');
  });
  return [header, ...rows].join('\n') + '\n';
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
