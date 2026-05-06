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
  const exportedAt = new Date().toISOString();
  const nsos = packets.filter((p) => (p.flags & FLAG_SOS) !== 0).length;
  const ndev = new Set(packets.map((p) => hex8(p.deviceId))).size;
  const metaDesc = `${packets.length} waypoint(s), ${ndev} device ID(s), ${nsos} SOS — LEP v1`;
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
<gpx version="1.1" creator="location-emitter/LEP-v1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <time>${exportedAt}</time>
    <desc>${escapeXml(metaDesc)}</desc>
  </metadata>
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

export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: number;
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
  meta: {
    exportedAt: string;
    packetCount: number;
    uniqueDeviceIds: number;
    sosCount: number;
  };
};

/** GeoJSON FeatureCollection (lon, lat) with summary `meta` (matches peer-map export shape). */
export function packetsToGeoJson(packets: LocationEmitterPacketV1[]): GeoJsonFeatureCollection {
  const digit = (b: number) => b.toString(16).padStart(2, '0');
  const features = packets.map((p, i) => ({
    type: 'Feature' as const,
    id: i,
    geometry: {
      type: 'Point' as const,
      coordinates: [p.lonE7 / 1e7, p.latE7 / 1e7] as [number, number],
    },
    properties: {
      unixTime: p.unixTime,
      altM: p.altM,
      hAccuracyM: p.hAccuracyM,
      batteryPct: p.batteryPct,
      flags: p.flags,
      sos: (p.flags & FLAG_SOS) !== 0,
      relayEligible: (p.flags & FLAG_RELAY_ELIGIBLE) !== 0,
      deviceIdHex: [...p.deviceId].map((x) => digit(x)).join(''),
      text: p.text,
    },
  }));
  const idStrings = packets.map((p) => [...p.deviceId].map((x) => digit(x)).join(''));
  return {
    type: 'FeatureCollection',
    features,
    meta: {
      exportedAt: new Date().toISOString(),
      packetCount: packets.length,
      uniqueDeviceIds: new Set(idStrings).size,
      sosCount: packets.reduce((n, p) => n + ((p.flags & FLAG_SOS) !== 0 ? 1 : 0), 0),
    },
  };
}

export function packetsToGeoJsonText(packets: LocationEmitterPacketV1[], space = 0): string {
  return JSON.stringify(packetsToGeoJson(packets), null, space > 0 ? space : undefined);
}
